import os
from typing import List, Dict, Any, ClassVar, Type
import time
import re
from pydantic import BaseModel, Field

from langchain.agents import AgentExecutor, create_react_agent
from langchain.chains import LLMChain
from langchain.tools.base import BaseTool
from langchain.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
import json

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


# Tool Definitions
class VivaQuestionGeneratorInput(BaseModel):
    action_input: str = Field(description="The full input containing all necessary parameters")


class VivaQuestionGeneratorTool(BaseTool):
    name: ClassVar[str] = "viva_question_generator"
    description: ClassVar[str] = "Generates viva questions based on the conversation history and subject matter"
    args_schema: ClassVar[Type[BaseModel]] = VivaQuestionGeneratorInput

    def __init__(self, llm, api_key_manager):
        super().__init__()
        self._llm = llm
        self._api_key_manager = api_key_manager
    
    def _run(self, action_input: str) -> str:
        """Generate the next viva question"""
        print(f"DEBUG - VivaQuestionGeneratorTool raw input: {action_input}")
        
        # Process the action_input to extract parameters
        params = self._extract_params(action_input)
        conversation_history = params.get("conversation_history", "")
        subject = params.get("subject", "Computer Science")
        syllabus = params.get("syllabus", "")
        difficulty = params.get("difficulty", 50)
        teacher_notes = params.get("teacher_notes", "")
        
        print(f"DEBUG - Extracted params: conversation_history={conversation_history[:50]}..., subject={subject}, syllabus={syllabus[:50]}..., difficulty={difficulty}, teacher_notes={teacher_notes[:50]}...")
        
        # Type checking and conversion
        if not isinstance(conversation_history, str):
            conversation_history = str(conversation_history) if conversation_history else ""
        if not isinstance(subject, str):
            subject = str(subject) if subject else "Computer Science"
        if not isinstance(syllabus, str):
            syllabus = str(syllabus) if syllabus else ""
        if not isinstance(difficulty, int):
            try:
                difficulty = int(difficulty) if difficulty else 50
            except (ValueError, TypeError):
                difficulty = 50
        if not isinstance(teacher_notes, str):
            teacher_notes = str(teacher_notes) if teacher_notes else ""
        

        api_key = self._api_key_manager.rotate_key()
        os.environ["GOOGLE_API_KEY"] = api_key
        
        template = """
         You are an expert interviewer conducting a viva examination. Your goal is to ask **one short, conceptual oral examination type question** that tests the student's **understanding and critical thinking Remember you don't have the ability to see or examine the practicals done by student so only ask questions related to theory and concepts and do not ask the use to demonstrate , write any answer **.

### **Context:**
- **Previous Conversation:** {conversation_history}
- **Subject:** {subject}
- **Syllabus content:** {syllabus}
- **Difficulty level (1-100):** {difficulty}
- **Teacher's Notes (Includes Student Performance Data):** {teacher_notes}

### **Instructions:**
1. The `{teacher_notes}` field contains **two key pieces of information**:
   - **Student Performance Data** (past mistakes, weak areas, strengths, confidence level).
   - **Teacher's Instructions** on how to approach questioning.

2. Generate a **single viva-style theoretical question** that:
   - **Matches the student's skill level** (adjust based on `{teacher_notes}`).
   - **Targets weak areas if mentioned in `{teacher_notes}`**.
   - **Adapts dynamically**:
     - If the student is struggling, **simplify & give hints**.
     - If the student is answering correctly, **increase difficulty gradually**.

3. Ensure the question:
   - Is clear, concise, and interactive, allowing follow-ups
   - Is focused on a single concept (not multiple concepts)
   - Can be answered in about 2-3 minutes
   - Relates to concepts already discussed in the conversation

### **Output Format:**
- **GENERATE ONLY ONE QUESTION**
- Be friendly, encouraging, and professional in your questioning
- **Avoid asking for practical demonstrations or code writing or writing anything since it is and oral examination**
- The question should be **short, thought-provoking, and specific**
- Do not include phrases like "Question:" or "Next question:"
    """
        
        prompt = PromptTemplate(
            input_variables=["conversation_history", "subject", "syllabus", "difficulty", "teacher_notes"],
            template=template
        )
        
        chain = LLMChain(llm=self._llm, prompt=prompt)
        
        try:
            return chain.run(
                conversation_history=conversation_history, 
                subject=subject,
                syllabus=syllabus,
                difficulty=difficulty,
                teacher_notes=teacher_notes
            )
        except Exception as e:
            # If error occurs, force rotate key and try again
            api_key = self._api_key_manager.rotate_key(force=True)
            os.environ["GOOGLE_API_KEY"] = api_key
            return chain.run(
                conversation_history=conversation_history, 
                subject=subject,
                syllabus=syllabus,
                difficulty=difficulty,
                teacher_notes=teacher_notes
            )
            
            
    def _extract_params(self, action_input: str) -> dict:
        """Extract parameters from the action_input string"""
        # If it's already a dictionary, return it
        if isinstance(action_input, dict):
            return action_input
            
        # If it's a string, try to parse as JSON
        if isinstance(action_input, str):
            # Check for code block markers
            if "```" in action_input:
                # Extract JSON between code blocks
                pattern = r'```(?:json)?\s*([\s\S]*?)\s*(?:```|$)'
                matches = re.findall(pattern, action_input)
                if matches:
                    action_input = matches[0].strip()
            
            # Try to parse as JSON if it looks like JSON
            if action_input.strip().startswith("{") and action_input.strip().endswith("}"):
                try:
                    return json.loads(action_input)
                except json.JSONDecodeError as e:
                    print(f"JSON parse error: {e}")
            
            # If it contains key-value pairs but isn't proper JSON, try to extract them
            if ":" in action_input:
                # Try to extract key-value pairs using regex
                params = {}
                for key in ["conversation_history", "subject", "syllabus", "difficulty", "teacher_notes"]:
                    pattern = rf'"{key}":\s*"([^"]*)"'
                    number_pattern = rf'"{key}":\s*(\d+)'
                    
                    # Try to match string values
                    matches = re.search(pattern, action_input)
                    if matches:
                        params[key] = matches.group(1)
                    else:
                        # Try to match number values (for difficulty)
                        number_matches = re.search(number_pattern, action_input)
                        if number_matches and key == "difficulty":
                            try:
                                params[key] = int(number_matches.group(1))
                            except ValueError:
                                pass
                
                if params:
                    return params
        
        # If all parsing attempts fail, return an empty dict
        return {}        

class TaskGeneratorInput(BaseModel):
    action_input: str = Field(description="The full input containing all necessary parameters")

class TaskGeneratorTool(BaseTool):
    name: ClassVar[str] = "task_generator"
    description: ClassVar[str] = "Generates  tasks for the student based on the conversation context"
    args_schema: ClassVar[Type[BaseModel]] = TaskGeneratorInput
    
    def __init__(self, llm, api_key_manager):
        super().__init__()
        self._llm = llm
        self._api_key_manager = api_key_manager
    
    def _run(self, action_input: str) -> str:
        """Generate a  task"""
        # Process the action_input to extract parameters
        params = self._extract_params(action_input)
        conversation_history = params.get("conversation_history", "")
        subject = params.get("subject", "Computer Science")
        syllabus = params.get("syllabus", "")
        difficulty = params.get("difficulty", 50)
        remaining_tasks = params.get("remaining_tasks", 1)
        teacher_notes = params.get("teacher_notes", "")
        
        # Type checking and conversion
        if not isinstance(conversation_history, str):
           conversation_history = str(conversation_history) if conversation_history else ""
        if not isinstance(subject, str):
           subject = str(subject) if subject else "Computer Science"
        if not isinstance(syllabus, str):
           syllabus = str(syllabus) if syllabus else ""
        if not isinstance(difficulty, int):
           try:
               difficulty = int(difficulty) if difficulty else 50
           except (ValueError, TypeError):
               difficulty = 50
        if not isinstance(remaining_tasks, int):
           try:
               remaining_tasks = int(remaining_tasks) if remaining_tasks else 1
           except (ValueError, TypeError):
               remaining_tasks = 1
        if not isinstance(teacher_notes, str):
              teacher_notes = str(teacher_notes) if teacher_notes else ""
                     
        
        # Rotate API key if needed
        api_key = self._api_key_manager.rotate_key()
        os.environ["GOOGLE_API_KEY"] = api_key
        
        template = """
      You are an expert **technical interviewer** designing **subject-specific practical tasks** for a viva examination.

### **Context:**
- **Previous Conversation:** {conversation_history}
- **Subject:** {subject}
- **Syllabus Content:** {syllabus}
- **Difficulty Level (1-100):** {difficulty}
- **Teacher’s Notes (Includes Student Performance Data & Questioning Strategy):** {teacher_notes}

### **Instructions:**
1. **Use `{teacher_notes}`** to tailor tasks based on:
   - Student’s **strengths & weaknesses**.
   - Areas that need **improvement**.
   - Preferred **task format** (if mentioned).
   - **Generate short ,  concise , clear , practical and only one task at a time** that can be answered in 5-7 minutes .

2. **Generate a practical task** related to `{subject}` that:
   - Is **short, clear, and concise** in 1-3 sentences.
   - Can be completed in **4-7 minutes** no matter what {difficulty}.
   - **Tests real-world application** of `{subject}` concepts.
   - Matches the **student’s skill level** (increase complexity if student is performing well).
   - **Avoids vague, overly broad, or impractical questions**.

3. **Vary the task format**:
   - If `{subject}` is coding-related → **Programming task (write, debug, optimize code).**
   - If `{subject}` is theoretical → **Scenario-based, MCQs, problem-solving.**
   - If `{teacher_notes}` mention weak areas → **Target those concepts.**

### **Output Format:**
- Return **only** the **task description** without any extra explanations.
- Make sure you give only one task at a time.
- **Avoid unnecessary formatting** like asterisks or hashtags or any other symbols except periods , commas and question marks.
- Ensure the task is **engaging, realistic, short and aligned with oral-examination style questioning**.
- **Do not include phrases like "Task:" or "Next task:"""
        
        prompt = PromptTemplate(
            input_variables=["conversation_history", "subject", "syllabus", "difficulty","teacher_notes"],
            template=template
        )
        
        chain = LLMChain(llm=self._llm, prompt=prompt)
        
        try:
            return chain.run(
                conversation_history=conversation_history, 
                subject=subject,
                syllabus=syllabus,
                difficulty=difficulty,
                remaining_tasks=remaining_tasks,
                teacher_notes=teacher_notes
            )
        except Exception as e:
            # If error occurs, force rotate key and try again
            api_key = self._api_key_manager.rotate_key(force=True)
            os.environ["GOOGLE_API_KEY"] = api_key
            return chain.run(
                conversation_history=conversation_history, 
                subject=subject,
                syllabus=syllabus,
                difficulty=difficulty,
                remaining_tasks=remaining_tasks
            )
    
    def _extract_params(self, action_input: str) -> dict:
        """Extract parameters from the action_input string"""
        # If it's already a dictionary, return it
        if isinstance(action_input, dict):
            return action_input
            
        # If it's a string, try to parse as JSON
        if isinstance(action_input, str):
            # Check for code block markers
            if "```" in action_input:
                # Extract JSON between code blocks
                pattern = r'```(?:json)?\s*([\s\S]*?)\s*(?:```|$)'
                matches = re.findall(pattern, action_input)
                if matches:
                    action_input = matches[0].strip()
            
            # Try to parse as JSON if it looks like JSON
            if action_input.strip().startswith("{") and action_input.strip().endswith("}"):
                try:
                    return json.loads(action_input)
                except json.JSONDecodeError as e:
                    print(f"JSON parse error: {e}")
            
            # If it contains key-value pairs but isn't proper JSON, try to extract them
            if ":" in action_input:
                # Try to extract key-value pairs using regex
                params = {}
                for key in ["conversation_history", "subject", "syllabus", "difficulty", "remaining_tasks"]:
                    pattern = rf'"{key}":\s*"([^"]*)"'
                    number_pattern = rf'"{key}":\s*(\d+)'
                    
                    # Try to match string values
                    matches = re.search(pattern, action_input)
                    if matches:
                        params[key] = matches.group(1)
                    else:
                        # Try to match number values (for difficulty and remaining_tasks)
                        number_matches = re.search(number_pattern, action_input)
                        if number_matches and (key == "difficulty" or key == "remaining_tasks"):
                            try:
                                params[key] = int(number_matches.group(1))
                            except ValueError:
                                pass
                
                if params:
                    return params
        
        # If all parsing attempts fail, return an empty dict
        return {}

class EndInterviewInput(BaseModel):
    action_input: str = Field(description="The full input containing information for the interview conclusion")

class EndInterviewTool(BaseTool):
    name: ClassVar[str] = "end_interview"
    description: ClassVar[str] = "Ends the viva examination and provides a conclusion"
    args_schema: ClassVar[Type[BaseModel]] = EndInterviewInput
    
    def __init__(self, llm, api_key_manager):
        super().__init__()
        self._llm = llm
        self._api_key_manager = api_key_manager
    
    def _run(self, action_input: str) -> str:
        """Generate a conclusion for the viva examination"""
        # Process the action_input to extract parameters
        params = self._extract_params(action_input)
        conversation_history = params.get("conversation_history", "")
        student_name = params.get("student_name", "Student")
        subject = params.get("subject", "Computer Science")
        
        # Type checking and conversion
        if not isinstance(conversation_history, str):
            conversation_history = str(conversation_history) if conversation_history else ""
        if not isinstance(student_name, str):
            student_name = str(student_name) if student_name else "Student"
        if not isinstance(subject, str):
            subject = str(subject) if subject else "Computer Science"
        
        # Rotate API key if needed
        api_key = self._api_key_manager.rotate_key()
        os.environ["GOOGLE_API_KEY"] = api_key
        
        template = """
        You are concluding a technical viva examination.
        
        Student Name: {student_name}
        Subject: {subject}
        Conversation history: {conversation_history}
        
        Generate a professional conclusion for the viva examination that:
        1. Thanks the student for their participation
        2. Mentions that the examination is now complete
        3. Is concise (3-5 sentences)
        4. Has a positive and encouraging tone
        5. Does not provide an assessment or grade
        
        Return only the conclusion message without any formatting symbols or additional explanations.
        """
        
        prompt = PromptTemplate(
            input_variables=["student_name", "subject", "conversation_history"],
            template=template
        )
        
        chain = LLMChain(llm=self._llm, prompt=prompt)
        
        try:
            return chain.run(
                student_name=student_name,
                subject=subject,
                conversation_history=conversation_history
            )
        except Exception as e:
            # If error occurs, force rotate key and try again
            api_key = self._api_key_manager.rotate_key(force=True)
            os.environ["GOOGLE_API_KEY"] = api_key
            return chain.run(
                student_name=student_name,
                subject=subject,
                conversation_history=conversation_history
            )
    
    def _extract_params(self, action_input: str) -> dict:
        """Extract parameters from the action_input string"""
        # Similar extraction logic as the other tools
        if isinstance(action_input, dict):
            return action_input
            
        # If it's a string, try to parse as JSON
        if isinstance(action_input, str):
            # Check for code block markers
            if "```" in action_input:
                pattern = r'```(?:json)?\s*([\s\S]*?)\s*(?:```|$)'
                matches = re.findall(pattern, action_input)
                if matches:
                    action_input = matches[0].strip()
            
            # Try to parse as JSON if it looks like JSON
            if action_input.strip().startswith("{") and action_input.strip().endswith("}"):
                try:
                    return json.loads(action_input)
                except json.JSONDecodeError as e:
                    print(f"JSON parse error: {e}")
            
            # If it contains key-value pairs but isn't proper JSON, try to extract them
            if ":" in action_input:
                # Try to extract key-value pairs using regex
                params = {}
                for key in ["conversation_history", "student_name", "subject"]:
                    pattern = rf'"{key}":\s*"([^"]*)"'
                    
                    # Try to match string values
                    matches = re.search(pattern, action_input)
                    if matches:
                        params[key] = matches.group(1)
                
                if params:
                    return params
        
        # If all parsing attempts fail, return an empty dict
        return {}


# Main Viva Agent Class
class VivaExaminationAgent:
    def __init__(self, gemini_api_keys: List[str], config: Dict[str, Any]):
        self.api_key_manager = APIKeyManager(gemini_api_keys)
        self.student_name = config.get('student_name', 'Student')
        self.student_info = config.get('student_info', '')
        self.subject = config.get('subject', '')
        self.syllabus = config.get('syllabus', '')
        self.teacher_notes = config.get('teacher_notes', '')
        self.difficulty = config.get('difficulty', 50)
        self.total_tasks = config.get('tasks', 2)
        self.completed_tasks = 0
        self.max_questions = config.get('max_questions', 10)  # Default to 10 if not specified

        self.conversation_history = []
        self.current_task = None
        
        # Initialize Gemini LLM
        api_key = self.api_key_manager.get_current_key()
        os.environ["GOOGLE_API_KEY"] = api_key
        
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0.7,
            google_api_key=api_key,
            response_mime_type="application/json",
        )
        
        # Initialize tools
        self.viva_question_tool = VivaQuestionGeneratorTool(self.llm, self.api_key_manager)
        self.task_generator_tool = TaskGeneratorTool(self.llm, self.api_key_manager)
        self.end_interview_tool = EndInterviewTool(self.llm, self.api_key_manager)
        
        # List of tools
        self.tools = [
            self.viva_question_tool,
            self.task_generator_tool,
            self.end_interview_tool
        ]
        
        # This is the critical fix for your issue
        agent_prompt = PromptTemplate(
    template="""
    You are an AI assistant conducting a technical viva examination. Your goal is to assess the student's knowledge through questions and practical tasks.
    
    Student: {student_name}
    Student Information: {student_info}
    Subject: {subject}
    Syllabus: {syllabus}
    Difficulty Level: {difficulty}
    teacher_notes: {teacher_notes}
    Current user input: {input}
    
    Conversation history:
    {conversation_history}
    
    Current state of the exam: {current_state}
    
    You have access to the following tools:
    {tools}
    
    Use the following format for your internal reasoning process:
    
    Question: the input question you must answer
    Thought: you should always think about what to do
    Action: the action to take, should be one of [{tool_names}]
    Action Input: the input to the action MUST be a valid JSON object with ALL required fields for the tool
    Observation: the result of the action
    Thought: I now know the final answer
    Final Answer: <your actual response to the student>
    
    CRITICAL INSTRUCTIONS:
    1. You MUST use the task_generator tool {total_tasks} times during the examination, but ONLY when instructed
    2. Currently {current_state}
    3. Ask ONLY ONE question at a time, and wait for the student's response
    4. Your Final Answer must ONLY contain the question text with no reasoning/explanation
    5. Do NOT include multiple questions in a single response
    6. Avoid any Typing Mistakes or spelling errors made by the student since it is an oral examination.
    6. Do NOT end the interview prematurely
    7. ONLY USE ONE TOOL PER STUDENT RESPONSE - you must return your answer after a single tool use
    8. STOP after using one tool and DO NOT continue the thought process or use additional tools
    
    For viva_question_generator tool, ALWAYS include all required fields:
    - conversation_history: string of conversation so far
    - subject: string of the subject being examined
    - syllabus: string of the syllabus content
    - difficulty: integer difficulty level
    - teacher_notes: string of additional notes
        
    For task_generator tool, ALWAYS include all required fields:
    - conversation_history: string of conversation so far
    - subject: string of the subject being examined 
    - syllabus: string of the syllabus content
    - difficulty: integer difficulty level
    - teacher_notes: string of additional notes
    
    {agent_scratchpad}
    """,
    input_variables=["student_name", "student_info", "subject", "conversation_history", "current_state", "input", "agent_scratchpad", "tools", "tool_names","syllabus","difficulty","teacher_notes","total_tasks"],
)
        self.agent = create_react_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=agent_prompt,
        )
        
        # Increase max_iterations to give agent more time to complete its reasoning
        self.agent_executor = AgentExecutor.from_agent_and_tools(
    agent=self.agent,
    tools=self.tools,
    verbose=True,  # Set to False in production, True for debugging
    handle_parsing_errors=True,
    max_iterations=1,  # Limit to 1 iteration to force single tool use
    max_execution_time=120,
    return_intermediate_steps=True,
    tool_input_override=self._fix_tool_input,
    handle_tool_error=lambda tool_error: f"Tool error occurred. Generating a simple question instead."
)
    
        # Fix 1: Complete the _fix_tool_input method which is cut off
    def _fix_tool_input(self, action_input: Any) -> Any:
        """Add missing required fields to tool inputs and properly parse JSON if needed"""
        print(f"DEBUG - action_input type: {type(action_input)}")
        
        # Convert string JSON to dict if needed
        if isinstance(action_input, str):
            print(f"DEBUG - Raw action_input string: {action_input}")
            # First, clean up markdown formatting
            cleaned_input = action_input
            
            # Remove markdown code block markers and 'json' language identifier
            if '```' in cleaned_input:
                # Remove ```json or ``` markers
                cleaned_input = re.sub(r'```(?:json)?\n', '', cleaned_input)
                cleaned_input = cleaned_input.replace('```', '')
                print(f"DEBUG - After removing markdown: {cleaned_input}")
            
            # Now try to parse the JSON
            cleaned_input = cleaned_input.strip()
            if cleaned_input.startswith('{') and cleaned_input.endswith('}'):
                try:
                    action_input = json.loads(cleaned_input)
                    print(f"DEBUG - Successfully parsed JSON: {action_input}")
                except json.JSONDecodeError as e:
                    print(f"DEBUG - JSON decode error: {e}")
                    action_input = {}
            else:
                action_input = {}
        
        # Ensure we have a dictionary
        if not isinstance(action_input, dict):
            print(f"DEBUG - Converting non-dict input to empty dict")
            action_input = {}
        
        # Add missing required fields based on tool type
        # This is critical for ensuring proper tool execution
        if 'tool' in action_input and isinstance(action_input['tool'], str):
            tool_name = action_input['tool']
            
            if 'conversation_history' not in action_input:
                action_input['conversation_history'] = self.get_conversation_history_text()
            
            if 'subject' not in action_input:
                action_input['subject'] = self.subject
                
            if 'syllabus' not in action_input:
                action_input['syllabus'] = self.syllabus
                
            if 'difficulty' not in action_input:
                action_input['difficulty'] = self.difficulty
                
            if 'teacher_notes' not in action_input:
                action_input['teacher_notes'] = self.teacher_notes
                
            # Add specific fields for task_generator
            if tool_name == 'task_generator' and 'remaining_tasks' not in action_input:
                action_input['remaining_tasks'] = self.total_tasks - self.completed_tasks
        
        return action_input
    
    def get_conversation_history_text(self) -> str:
     """Get formatted conversation history"""
     if not self.conversation_history:
        return "No conversation yet."
    
    # Use the last few exchanges to prevent context overflow
     recent_history = self.conversation_history[-10:] if len(self.conversation_history) > 10 else self.conversation_history
    
     history_text = ""
     for entry in recent_history:
        # Use clearer role labels
        role = "Examiner" if entry['role'] == 'Assistant' else "Student"
        history_text += f"{role}: {entry['content']}\n\n"
    
     print(f"Recent conversation history:\n{history_text}")
     return history_text
    
        # Fix 3: Modify determine_current_state to explicitly encourage task generation
    def determine_current_state(self) -> str:
        """Determine the current state of the viva examination"""
        if not self.conversation_history:
            return "Beginning of examination. Generate an appropriate introduction."
        
        # Check remaining tasks and be more explicit about task generation
        remaining_tasks = self.total_tasks - self.completed_tasks
        
        # Count how many messages have been exchanged
        message_count = len(self.conversation_history)
        
        # If we have remaining tasks and enough conversation history, strongly suggest using the task_generator
        if remaining_tasks > 0:
            # Use a pattern to distribute tasks throughout the examination
            if message_count >= 3 and self.completed_tasks == 0:
                return f"IMPORTANT: Use the task_generator tool now to assign the first practical task. {remaining_tasks} tasks remaining."
            elif message_count >= 7 and self.completed_tasks == 1:
                return f"IMPORTANT: Use the task_generator tool now to assign the second practical task. {remaining_tasks} tasks remaining."
            elif message_count >= 10 and remaining_tasks > 0:
                return f"IMPORTANT: Use the task_generator tool now. {remaining_tasks} tasks remaining that must be assigned."
        
        # Default state
        return "Continue the examination with appropriate theoretical questions."
    
    def extract_task_description(self) -> str:
        """Extract the most recent task description from conversation history"""
        for msg in reversed(self.conversation_history):
            if msg['role'] == 'Assistant' and (" task" in msg['content'].lower() or "write a" in msg['content'].lower()):
                return msg['content']
        return "Write code as requested"
    
    def extract_code_submission(self, message: str) -> str:
        """Extract code from user message"""
        # Check for code blocks
        if "```" in message:
            parts = message.split("```")
            if len(parts) >= 3:  # At least one complete code block
                return parts[1].strip()
        
        # If no code blocks but SQL keywords exist, return the whole message
        if any(kw in message.upper() for kw in ["SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "ALTER"]):
            return message.strip()
            
        # If no code blocks but function definition exists
        if "function" in message.lower() or "def " in message:
            return message.strip()
            
        return message.strip()
    
    
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
    
    # Remove tool selection patterns
      response = re.sub(r'\d+\.\s*.*?using.*?\n', '', response)
    
    # Remove any tool error messages
      response = re.sub(r'.*?is not a valid tool, try one of.*?\n', '', response)
    
    # Remove multiple consecutive newlines
      response = re.sub(r'\n{2,}', '\n\n', response)
    
      return response.strip() 
    
        # Fix 2: Update process_message method to include total_tasks parameter
    def process_message(self, message: str) -> dict:
     """Process an incoming message from the student"""
    # Add message to conversation history
     self.conversation_history.append({
        "role": "User",
        "content": message
    })
        
    # Check if we've reached the maximum questions
     num_assistant_messages = sum(1 for entry in self.conversation_history if entry['role'] == 'Assistant')
     if num_assistant_messages >= self.max_questions:
        # Use end_interview tool directly
        end_input = {
            "conversation_history": self.get_conversation_history_text(),
            "student_name": self.student_name,
            "subject": self.subject
        }
        conclusion = self.end_interview_tool._run(json.dumps(end_input))
        
        # Add response to conversation history
        self.conversation_history.append({
            "role": "Assistant",
            "content": conclusion
        })
        return {"message": conclusion, "isTask": False}
        
    # Determine current state
     current_state = self.determine_current_state()
     print(f"Current state: {current_state}")
        
    # Prepare inputs for the agent
     inputs = {
        "student_name": self.student_name,
        "student_info": self.student_info,
        "subject": self.subject,
        "conversation_history": self.get_conversation_history_text(),
        "syllabus": self.syllabus,
        "difficulty": self.difficulty,
        "teacher_notes": self.teacher_notes,
        "current_state": current_state,
        "input": message,
        "total_tasks": self.total_tasks,
        "tasks": self.total_tasks
    }
    
    # Execute the agent to get response
     try:
        response = self.agent_executor.invoke(inputs)
        
        # Extract the response from the agent
        agent_response = response.get("output", "")
        cleaned_response = self.clean_response(agent_response)
        
        # Check if task_generator tool was used
        is_task = False
        used_tool = None
        if "intermediate_steps" in response:
            for step in response["intermediate_steps"]:
                if len(step) >= 2 and hasattr(step[0], 'tool'):
                    used_tool = step[0].tool
                    if used_tool == "task_generator":
                        is_task = True
                        self.completed_tasks += 1
                    # Only use the first tool's response
                    cleaned_response = self.clean_response(step[1])
                    break
        
        # If the response is empty or unclear, use the viva_question_generator directly
        if not cleaned_response or len(cleaned_response) < 10:
            question_input = {
                "conversation_history": self.get_conversation_history_text(),
                "subject": self.subject,
                "syllabus": self.syllabus,
                "difficulty": self.difficulty,
                "teacher_notes": self.teacher_notes
            }
            cleaned_response = self.viva_question_tool._run(json.dumps(question_input))
            is_task = False
        
        # Add response to conversation history
        self.conversation_history.append({
            "role": "Assistant",
            "content": cleaned_response
        })
        
        return {"message": cleaned_response, "isTask": is_task}
        
     except Exception as e:
        print(f"Error processing message: {str(e)}")
        print(f"Error processing message: {str(e)}")
            # Use a direct approach if the agent fails
        backup_question_input = {
                "conversation_history": self.get_conversation_history_text(),
                "subject": self.subject,
                "syllabus": self.syllabus,
                "difficulty": self.difficulty,
                "teacher_notes": self.teacher_notes
            }
            
        try:
                fallback_response = self.viva_question_tool._run(json.dumps(backup_question_input))
                self.conversation_history.append({
                    "role": "Assistant",
                    "content": fallback_response
                })
                return {"message": fallback_response, "isTask": False}
        except:
                error_msg = f"I apologize, but I encountered an error. Let's continue with a simpler question about {self.subject}."
                self.conversation_history.append({
                    "role": "Assistant",
                    "content": error_msg
                })
                return {"message": error_msg, "isTask": False}
        
        # Rest of the exception handling code remains the same
    def start_viva(self) -> dict:  # Changed return type to dict
        """Start the viva examination with an introduction"""
        # Generate an introduction using the LLM instead of hardcoding
        prompt_template = """
        Generate an introduction for a technical viva (oral examination) for a student.
        
        Subject: {subject}
        Student Name: {student_name}
        Student Information: {student_info}
        Syllabus: {syllabus}
        
        The introduction should:
        1. Be professional but friendly
        2. Welcome the student
        3. Briefly explain the purpose of the viva
        4. Give a high-level overview of what will be covered
        5. Be concise (3-5 sentences)
        
        Return only the introduction text without any formatting symbols.
        """
        
        prompt = PromptTemplate(
            input_variables=["subject", "student_name", "student_info", "syllabus"],
            template=prompt_template
        )
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        
        try:
            intro_message = chain.run(
                subject=self.subject,
                student_name=self.student_name,
                student_info=self.student_info,
                syllabus=self.syllabus
            )
            
            # Clean any formatting issues
            intro_message = self.clean_response(intro_message)
            
            # Add to conversation history
            self.conversation_history.append({
                "role": "Assistant",
                "content": intro_message
            })
            
            return {"message": intro_message, "isTask": False}
        except Exception as e:
            # Fallback introduction if there's an error
            intro_message = f"Hello {self.student_name}! Welcome to your {self.subject} viva examination. I'll be asking you a series of questions to assess your knowledge. Let's begin."
            
            self.conversation_history.append({
                "role": "Assistant",
                "content": intro_message
            })
            
            return {"message": intro_message, "isTask": False}
        