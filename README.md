# Enterprise Compliance & Communication Platform

A full-stack enterprise system for HR, compliance, and operations with role-based access, messaging, auditing, and AI-powered analytics.

## Tech Stack

- **Backend**: NestJS + Prisma + PostgreSQL
- **Web**: React + Vite + TypeScript
- **Mobile**: React Native + Expo
- **Monorepo**: Turborepo + pnpm

## Getting Started

```bash
pnpm install
cd apps/api && pnpm prisma migrate dev
pnpm dev
```

## Project Structure

```
apps/
├── api/              # NestJS backend
├── web/              # React web app
└── mobile/           # React Native app
packages/
└── shared/           # Shared types
```
