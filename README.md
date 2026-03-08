# Expense Claim System

A modern enterprise expense management platform with multi-role approval workflows, financial reporting, and expense categorization.

![React](https://img.shields.io/badge/React-19.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Overview

Expense Claim System helps organizations streamline their expense reimbursement process. Employees can submit expense claims with attachments, managers can review and approve requests, and finance teams can process payments efficiently.

### Key Features

- **Easy Submission** - Submit expense claims with categories like travel, meals, and supplies
- **Multi-Level Approvals** - Configurable approval workflows with manager and finance reviews
- **Real-Time Tracking** - Monitor claim status from submission to payment
- **Email Notifications** - Automatic notifications for status updates
- **Admin Dashboard** - Manage users, workflows, and system settings

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

```bash
# Clone the repository
cd expense-claim-system

# Install dependencies
npm install
```

### Running the Application

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:3008`

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Employee | david@example.com | password123 |
| Admin | admin@example.com | admin123 |

## Project Structure

```
expense-claim-system/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   └── db/             # Database
├── server.ts           # Express server
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production

## Documentation

For detailed technical documentation, see [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md)

## License

MIT License
