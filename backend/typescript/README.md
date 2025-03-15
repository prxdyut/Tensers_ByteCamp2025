# WhatsApp Web.js with Express TypeScript

This project integrates WhatsApp Web.js with an Express TypeScript application, allowing you to create a WhatsApp bot with a web interface.

## Prerequisites

- Node.js (v14 or higher)
- npm
- A WhatsApp account

## Installation

1. Clone this repository
2. Install dependencies:
```bash
npm install
```

## Development

To run the application in development mode:
```bash
npm run dev
```

## Building and Running

To build the application:
```bash
npm run build
```

To start the application:
```bash
npm start
```

## Usage

1. Start the application using one of the methods above
2. Scan the QR code that appears in the console with WhatsApp
3. Once connected, the bot will respond to the following commands:
   - `!ping`: Bot will reply with "pong"

## Features

- Express server running on port 3000
- WhatsApp Web.js integration
- TypeScript support
- Hot reloading in development
- Local authentication storage 