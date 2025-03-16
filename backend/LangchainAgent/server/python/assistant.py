import os
import time
import json
import re
import uuid
import logging
import base64
import io
import tempfile
from datetime import datetime
from typing import List, Dict, Any, ClassVar, Type
from pydantic import BaseModel, Field

from langchain.agents import AgentExecutor, create_react_agent
from langchain.chains import LLMChain
from langchain.tools.base import BaseTool
from langchain.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from PIL import Image
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# API Key Management Class
class APIKeyManager:
    def __init__(self, api_keys: List[str]):
        self.api_keys = api_keys
        self.current_index = 0
        self.last_rotation_time = time.time()
        
    def get_current_key(self) -> str:
        """Get the current API key"""
        return self.api_keys[self.current_index]
    
    def rotate_key(self, force: bool = False) -> str:
        """Rotate to the next API key"""
        current_time = time.time()
        # Rotate if forced or if more than 5 minutes have passed
        if force or (current_time - self.last_rotation_time > 300):
            self.current_index = (self.current_index + 1) % len(self.api_keys)
            self.last_rotation_time = current_time
        return self.get_current_key()

# Tool Input Schemas
class PatientAnalysisInput(BaseModel):
    conversation_history: str = Field(description="Complete conversation history between doctor and patient")
    user_input: str = Field(description="Current user input/message")
    image_analysis: str = Field(default="", description="Analysis of patient's visual appearance if available")
    patient_info: str = Field(default="", description="Known patient information")

class ImageAnalysisInput(BaseModel):
    image_base64: str = Field(description="Base64 encoded image of the patient or medical document")
    user_input: str = Field(default="", description="Current user input that provides context to the image")

# Tool for analyzing patient's webcam frame and speech input
class PatientAnalysisTool(BaseTool):
    name: ClassVar[str] = "patient_analysis"
    description: ClassVar[str] = "Analyzes patient symptoms and provides medical advice based on conversation and video feed"
    args_schema: ClassVar[Type[BaseModel]] = PatientAnalysisInput

    def __init__(self, llm, api_key_manager):
        super().__init__()
        self._llm = llm
        self._api_key_manager = api_key_manager

    def _run(self, conversation_history: str, user_input: str, image_analysis: str = "", patient_info: str = "") -> str:
        """Generate medical response based on conversation and visual analysis"""
        logger.info("Running patient analysis with conversation history")
        
        # Rotate API key if needed
        api_key = self._api_key_manager.rotate_key()
        os.environ["GOOGLE_API_KEY"] = api_key
        
        template = """
        You are an AI doctor assistant providing medical advice to a patient. You should be professional, empathetic, and informative.

        ### Context:
        - Patient's current message: {user_input}
        - Previous conversation: {conversation_history}
        - Patient visual analysis: {image_analysis}
        - Known patient information: {patient_info}

        ### Instructions:
        1. Analyze the patient's symptoms and concerns based on their messages and visual appearance.
        2. Ask relevant follow-up questions if needed to better understand their situation.
        3. Provide clear, accurate medical information and advice.
        4. Be empathetic and professional in your tone.
        5. If you notice signs of a serious medical condition, advise the patient to seek immediate medical attention.
        6. Do not make definitive diagnoses, but instead offer possible explanations and recommendations.
        7. You are allowed to recommend very basic first aid or basic treatments, but avoid prescribing medications.

        ### Response Format Requirements:
        - Keep your response between 3-7 sentences, focusing only on the most relevant information
        - Be direct and to the point while maintaining a compassionate tone
        - Avoid lengthy explanations and medical jargon
        - Focus on addressing the current concern with actionable advice
        - Do not include unnecessary details or tangential information
        """
        
        prompt = PromptTemplate(
            input_variables=["conversation_history", "user_input", "image_analysis", "patient_info"],
            template=template
        )
        
        chain = LLMChain(llm=self._llm, prompt=prompt)
        
        try:
            return chain.run(
                conversation_history=conversation_history, 
                user_input=user_input,
                image_analysis=image_analysis if image_analysis else "No visual analysis available",
                patient_info=patient_info if patient_info else "No specific patient information provided"
            )
        except Exception as e:
            logger.error(f"Error in patient analysis tool: {str(e)}")
            
            # If error occurs, force rotate key and try again
            api_key = self._api_key_manager.rotate_key(force=True)
            os.environ["GOOGLE_API_KEY"] = api_key
            
            try:
                return chain.run(
                    conversation_history=conversation_history, 
                    user_input=user_input,
                    image_analysis=image_analysis if image_analysis else "No visual analysis available",
                    patient_info=patient_info if patient_info else "No specific patient information provided"
                )
            except Exception as e:
                return "I'm having trouble analyzing your information right now. Could you please repeat your concern?"

# Tool for analyzing medical images uploaded by patients
class MedicalImageAnalysisTool(BaseTool):
    name: ClassVar[str] = "medical_image_analysis"
    description: ClassVar[str] = "Analyzes patient-provided medical images like x-rays, skin conditions, etc."
    args_schema: ClassVar[Type[BaseModel]] = ImageAnalysisInput

    def __init__(self, llm, api_key_manager):
        super().__init__()
        self._llm = llm
        self._api_key_manager = api_key_manager

    def _run(self, image_base64: str, user_input: str = "") -> str:
        """Generate medical analysis based on uploaded image"""
        logger.info("Running medical image analysis")
        
        # Rotate API key if needed
        api_key = self._api_key_manager.rotate_key()
        os.environ["GOOGLE_API_KEY"] = api_key
        
        template = """
        You are a medical image analysis AI examining patient-uploaded medical images. Analyze the provided image and provide relevant medical insights.

        ### Context:
        - Patient provided context: {user_input}

        ### Instructions:
        1. Analyze the provided medical image carefully.
        2. Focus on identifying potential medical indicators, abnormalities, or conditions visible in the image.
        3. Consider the patient's context message: "{user_input}"
        4. Be thorough but avoid making definitive diagnoses.
        5. Explain what you can observe in clear, professional language.
        6. If the image appears to show a concerning condition, recommend appropriate follow-up steps.
        7. If the image quality is poor or insufficient, explain what limitations this creates.
        8. Remember to provide educational context about what is observed.

        ### Output Format:
        Provide an analysis that is:
        - Clear and professional
        - Educational about what is visible
        - Focused on observations rather than diagnoses
        - Including appropriate recommendations for next steps
        - Acknowledging limitations of image-based analysis
        """
        
        prompt = PromptTemplate(
            input_variables=["user_input"],
            template=template
        )
        
        chain = LLMChain(llm=self._llm, prompt=prompt)
        
        try:
            # In a real implementation with Gemini Vision, you would process the image here
            # For now, we'll use a text-based approach
            response = chain.run(
                user_input=user_input if user_input else "No specific context provided"
            )
            return response
        except Exception as e:
            logger.error(f"Error in medical image analysis tool: {str(e)}")
            
            # If error occurs, force rotate key and try again
            api_key = self._api_key_manager.rotate_key(force=True)
            os.environ["GOOGLE_API_KEY"] = api_key
            
            try:
                return chain.run(
                    user_input=user_input if user_input else "No specific context provided"
                )
            except:
                return "I'm unable to properly analyze the medical image at this time. The image may be unclear or our systems might be experiencing difficulties."

# Main Doctor Agent Class
class DoctorAgent:
    def __init__(self, gemini_api_keys: List[str], config: Dict[str, Any] = None):
        self.api_key_manager = APIKeyManager(gemini_api_keys)
        self.config = config or {}
        self.user_id = config.get("user_id", "anonymous")
        self.patient_info = config.get("patient_info", "")
        self.conversation_history = []
        
        # Initialize Gemini LLM
        api_key = self.api_key_manager.get_current_key()
        os.environ["GOOGLE_API_KEY"] = api_key
        
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0.7,
            google_api_key=api_key,
        )
        
        # Initialize tools
        self.patient_analysis_tool = PatientAnalysisTool(self.llm, self.api_key_manager)
        self.medical_image_analysis_tool = MedicalImageAnalysisTool(self.llm, self.api_key_manager)
        
        # List of tools
        self.tools = [
            self.patient_analysis_tool,
            # self.medical_image_analysis_tool
        ]
        
        # Create agent prompt
        agent_prompt = PromptTemplate(
            template="""
            You are an AI doctor assistant helping patients with their medical concerns. Your goal is to provide helpful medical information and advice.
            
            Patient ID: {user_id}
            Patient Information: {patient_info}
            Current patient input: {input}
            
            Conversation history:
            {conversation_history}
            
            You have access to the following tools:
            {tools}
            
            Use the following format for your internal reasoning process:
            
            Question: the input question you must answer
            Thought: you should always think about what to do
            Action: the action to take, should be one of [{tool_names}]
            Action Input: the input to the action MUST be a valid JSON object with ALL required fields for the tool
            Observation: the result of the action
            Thought: I now know the final answer
            Final Answer: <your actual response to the patient>
            
            CRITICAL INSTRUCTIONS:
            1. For normal conversation with webcam, ALWAYS use patient_analysis tool
            2. Ensure your response is professional, empathetic, and medically accurate
            3. Do not make definitive diagnoses, but offer possible explanations and recommendations
            4. Always clarify that you are an AI and not a replacement for professional medical care
            5. If you suspect a serious medical condition, advise the patient to seek immediate medical attention
            6. Keep your responses concise (3-7 sentences) and focused on the patient's immediate concerns
            7. Avoid long explanations, unnecessary details, or tangential information
            
            For patient_analysis tool, ALWAYS include:
            - conversation_history: string of conversation so far
            - user_input: the patient's current message
            - image_analysis: analysis of the patient's appearance from webcam
            - patient_info: any known information about the patient
            
            
            {agent_scratchpad}
            """,
            input_variables=[
                "user_id", "patient_info", "input", "conversation_history", 
                "tools", "tool_names", "agent_scratchpad"
            ],
        )
        
        # Initialize the agent
        self.agent = create_react_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=agent_prompt,
        )
        
        # Agent executor
        self.agent_executor = AgentExecutor.from_agent_and_tools(
            agent=self.agent,
            tools=self.tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=3,
            max_execution_time=120,
            return_intermediate_steps=True,
            tool_input_override=self._fix_tool_input,
            handle_tool_error=lambda tool_error: f"Tool error occurred: {tool_error}. Let me try a different approach."
        )
    
    def _fix_tool_input(self, action_input: Any) -> Any:
        """Add missing required fields to tool inputs and properly parse JSON if needed"""
        print(f"DEBUG - action_input type: {type(action_input)}")
        print(f"DEBUG - action_input value: {action_input}")
        
        # Handle case where action_input is None or invalid
        if action_input is None:
            return {
                "conversation_history": self.get_conversation_history_text(),
                "user_input": "Help me with my medical issue",
                "image_analysis": "No visual analysis available",
                "patient_info": self.patient_info or "No patient info provided"
            }
        
        # Convert string JSON to dict if needed
        if isinstance(action_input, str):
            # First, clean up markdown formatting
            cleaned_input = action_input
            
            # Remove markdown code block markers and 'json' language identifier
            if '```' in cleaned_input:
                cleaned_input = re.sub(r'```(?:json)?\n', '', cleaned_input)
                cleaned_input = cleaned_input.replace('```', '')
            
            # Now try to parse the JSON
            cleaned_input = cleaned_input.strip()
            if cleaned_input.startswith('{') and cleaned_input.endswith('}'):
                try:
                    action_input = json.loads(cleaned_input)
                except json.JSONDecodeError:
                    # If JSON parsing fails, create a basic structure for patient_analysis tool
                    action_input = {
                        "conversation_history": self.get_conversation_history_text(),
                        "user_input": cleaned_input,
                        "image_analysis": "No visual analysis available",
                        "patient_info": self.patient_info or "No patient info provided"
                    }
            else:
                # If it's not JSON, use the string as user_input
                action_input = {
                    "conversation_history": self.get_conversation_history_text(),
                    "user_input": cleaned_input,
                    "image_analysis": "No visual analysis available",
                    "patient_info": self.patient_info or "No patient info provided"
                }
        
        # Ensure we have a dictionary
        if not isinstance(action_input, dict):
            action_input = {
                "conversation_history": self.get_conversation_history_text(),
                "user_input": str(action_input) if action_input is not None else "Help me with my medical issue",
                "image_analysis": "No visual analysis available",
                "patient_info": self.patient_info or "No patient info provided"
            }
        
        # If there's already a tool key in the input, handle it correctly
        if 'tool' in action_input:
            tool_name = action_input['tool']
            # Remove tool key as it's not part of the actual tool inputs
            del action_input['tool']
            
            # Make sure required fields exist for each tool
            if tool_name == 'patient_analysis':
                if 'conversation_history' not in action_input:
                    action_input['conversation_history'] = self.get_conversation_history_text()
                if 'user_input' not in action_input and 'input' in action_input:
                    action_input['user_input'] = action_input['input']
                    del action_input['input']
                if 'patient_info' not in action_input:
                    action_input['patient_info'] = self.patient_info or "No patient info provided"
                if 'image_analysis' not in action_input:
                    action_input['image_analysis'] = "No visual analysis available"
            
            elif tool_name == 'medical_image_analysis':
                if 'user_input' not in action_input and 'input' in action_input:
                    action_input['user_input'] = action_input['input']
                    del action_input['input']
                    
        # If no explicit tool is specified, assume patient_analysis
        else:
            if 'conversation_history' not in action_input:
                action_input['conversation_history'] = self.get_conversation_history_text()
            if 'user_input' not in action_input and 'input' in action_input:
                action_input['user_input'] = action_input['input']
                if 'input' in action_input:
                    del action_input['input']
            if 'patient_info' not in action_input:
                action_input['patient_info'] = self.patient_info or "No patient info provided"
            if 'image_analysis' not in action_input:
                action_input['image_analysis'] = "No visual analysis available"
        
        print(f"DEBUG - Fixed action_input: {action_input}")
        return action_input
    def get_conversation_history_text(self) -> str:
        """Get formatted conversation history"""
        if not self.conversation_history:
            return "No conversation yet."
        
        # Use the last few exchanges to prevent context overflow
        recent_history = self.conversation_history[-10:] if len(self.conversation_history) > 10 else self.conversation_history
        
        history_text = ""
        for entry in recent_history:
            role = "Patient" if entry['role'] == 'user' else "Doctor"
            history_text += f"{role}: {entry['content']}\n\n"
        
        return history_text
    
    def analyze_webcam_frame(self, frame_image):
        """Analyze the patient's appearance from webcam frame"""
        # This would ideally use Gemini Vision API to analyze the frame
        # For now, we'll return a simple placeholder analysis
        
        try:
            # In a real implementation, this would use Gemini Vision API
            # But for this demonstration, we'll return a simple analysis
            return "Patient appears visible in the webcam. No obvious signs of distress noted."
        except Exception as e:
            logger.error(f"Error analyzing webcam frame: {str(e)}")
            return "Unable to analyze patient's visual appearance."
    
        # Modify the process_patient_message method to accept pre-processed image analysis
    def process_patient_message(self, message: str, image_analysis: str = "No visual analysis available") -> dict:
        """Process a message from the patient with image analysis result"""
        # Add message to conversation history
        self.conversation_history.append({
        "role": "user",
        "content": message,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
       })
        
        try:
            # Prepare inputs for the agent
            inputs = {
            "user_id": self.user_id,
            "patient_info": self.patient_info,
            "conversation_history": self.get_conversation_history_text(),
            "input": message,
            "image_analysis": image_analysis  # This is now preprocessed by Node.js
        }
            
            # Execute the agent to get response
            try:
                response = self.agent_executor.invoke(inputs)
                agent_response = response.get("output", "")
                cleaned_response = self.clean_response(agent_response)
            except Exception as agent_error:
                logger.error(f"Agent execution failed: {str(agent_error)}")
                # Fallback to direct tool use
                tool_input = {
                    "conversation_history": self.get_conversation_history_text(),
                    "user_input": message,
                    "image_analysis": image_analysis,
                    "patient_info": self.patient_info or ""
                }
                
                cleaned_response = self.patient_analysis_tool._run(**tool_input)
            
            # Add response to conversation history
            self.conversation_history.append({
                "role": "assistant",
                "content": cleaned_response,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
            
            return {"message": cleaned_response}
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            
            # Fallback response
            fallback_response = "I apologize, but I'm having trouble processing your information. Could you try rephrasing your question?"
            
            self.conversation_history.append({
                "role": "assistant",
                "content": fallback_response,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
            
            return {"message": fallback_response}
        
    def process_uploaded_medical_image(self, message: str, image_data: str) -> dict:
        """Process an uploaded medical image with context message"""
        # Add message to conversation history
        self.conversation_history.append({
            "role": "user",
            "content": f"[Uploaded a medical image] {message}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
        
        try:
            # Direct call to medical image analysis tool
            # In a real implementation, this would use Gemini Vision API
            tool_input = {
                "image_base64": image_data,
                "user_input": message
            }
            
            analysis = self.medical_image_analysis_tool._run(**tool_input)
            
            # Generate response that incorporates the image analysis
            template = """
            You are a medical professional responding to a patient who has uploaded a medical image.
            
            The patient said: "{message}"
            
            Analysis of the image shows: {analysis}
            
            Provide a helpful, empathetic response that:
            1. Acknowledges their concern
            2. Incorporates insights from the image analysis
            3. Provides relevant medical information or advice
            4. Clarifies limitations of AI analysis and recommends professional care when appropriate
            
            Remember to maintain a professional but warm tone, and avoid definitive diagnoses.
            """
            
            prompt = PromptTemplate(
                input_variables=["message", "analysis"],
                template=template
            )
            
            chain = LLMChain(llm=self.llm, prompt=prompt)
            response_text = chain.run(message=message, analysis=analysis)
            
            # Add response to conversation history
            self.conversation_history.append({
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
            
            return {"message": response_text}
        except Exception as e:
            logger.error(f"Error processing uploaded image: {str(e)}")
            
            # Use a direct approach if the analysis fails
            fallback_response = "I apologize, but I'm having trouble analyzing the image you uploaded. Could you please upload a clearer image or describe what you're seeing in the image?"
            
            # Add fallback response to conversation history
            self.conversation_history.append({
                "role": "assistant",
                "content": fallback_response,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
            
            return {"message": fallback_response}
    
    def clean_response(self, response: str) -> str:
            """Clean the response from any tool artifacts or debugging info"""
            # First check if we have a Final Answer section
            final_answer_match = re.search(r'Final Answer:\s*(.*?)(?=$|\n\n)', response, re.DOTALL)
            if final_answer_match:
                return final_answer_match.group(1).strip()
            
            # If no Final Answer, check for direct tool output (observation)
            observation_match = re.search(r'Observation:\s*(.*?)(?=\n\nThought:|$)', response, re.DOTALL)
            if observation_match:
                return observation_match.group(1).strip()
            
            # Remove any markdown formatting
            response = re.sub(r'```.*?```', '', response, flags=re.DOTALL)
            
            # Remove any "Action:" and "Action Input:" lines and everything between them
            response = re.sub(r'Action:.*?Action Input:.*?\n', '', response, flags=re.DOTALL)
            
            # Remove any "Thought:" lines and the text that follows until the next section
            response = re.sub(r'Thought:.*?(?=(Action:|Observation:|Final Answer:|$))', '', response, flags=re.DOTALL)
            
            # Remove "Question:" lines
            response = re.sub(r'Question:.*?\n', '', response)
            
            # Remove "Observation:" lines
            response = re.sub(r'Observation:.*?\n', '', response, flags=re.DOTALL)
            
            # Remove "Final Answer:" prefix if it exists
            response = re.sub(r'^Final Answer:\s*', '', response)
            
            # Remove "Entering new AgentExecutor chain..." lines
            response = re.sub(r'Entering new AgentExecutor chain...\n*', '', response)
            
            # Remove multiple consecutive newlines
            response = re.sub(r'\n{2,}', '\n\n', response)
            
            # Trim overly long responses
            cleaned_text = response.strip()
            if len(cleaned_text) > 750:  # Target length for medium-sized responses
                # Split into sentences and trim
                sentences = re.split(r'(?<=[.!?])\s+', cleaned_text)
                shortened_text = ""
                for sentence in sentences:
                    if len(shortened_text) + len(sentence) < 750:
                        shortened_text += sentence + " "
                    else:
                        break
                cleaned_text = shortened_text.strip()
                
                # Add ellipsis if we've trimmed content
                if cleaned_text != response.strip():
                    cleaned_text += "..."
                    
            return cleaned_text
    
    def start_session(self) -> dict:
        """Start a new conversation with the patient"""
        # Generate an introduction using the LLM
        prompt_template = """
        Generate a friendly introduction for an AI medical assistant speaking to a patient.
        
        The introduction should:
        1. Be professional but warm and welcoming
        2. Briefly explain that you're an AI doctor assistant designed to provide medical information
        3. Clarify that you're not a replacement for professional medical care
        4. Invite the patient to describe their medical concerns or questions
        5. Be concise (3-5 sentences)
        
        Return only the introduction text without any formatting symbols.
        """
        
        prompt = PromptTemplate(
            input_variables=[],
            template=prompt_template
        )
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        
        try:
            intro_message = chain.run()
            
            # Clean any formatting issues
            intro_message = self.clean_response(intro_message)
            
            # Add to conversation history
            self.conversation_history.append({
                "role": "assistant",
                "content": intro_message,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
            
            return {"message": intro_message}
        except Exception as e:
            # Fallback introduction if there's an error
            intro_message = "Hello! I'm your AI doctor assistant. I'm here to provide medical information and answer your health-related questions. While I'm not a replacement for professional medical care, I'll do my best to help. How can I assist you today?"
            
            self.conversation_history.append({
                "role": "assistant",
                "content": intro_message,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
            
            return {"message": intro_message}