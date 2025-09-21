# makeprogress - Weekly Personal Development Goal Tracker

## Overview

makeprogress is a comprehensive web application designed to help users set, track, and achieve weekly personal development goals across six distinct life categories: Personal, Inner Peace, Health, Family, Career, and Fun. The application features a gamified approach to goal tracking with achievement levels and progress monitoring, encouraging holistic personal growth through structured weekly goal completion.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom design system and CSS variables for theming
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent, accessible design
- **State Management**: React Query (TanStack Query) for server state management and caching
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful API architecture with organized route handlers
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL session store
- **Middleware**: Custom logging, error handling, and authentication middleware

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle Kit for database migrations and schema updates
- **Session Storage**: PostgreSQL-based session store using connect-pg-simple
- **Connection Pooling**: Neon serverless connection pooling for scalability

### Authentication and Authorization
- **Authentication Provider**: Replit Auth integration for OAuth-based authentication
- **Session Management**: Server-side sessions with secure HTTP-only cookies
- **User Management**: Standardized user schema compatible with Replit Auth requirements
- **Route Protection**: Middleware-based authentication checks for protected routes

### Goal Management System
- **Category System**: Six predefined life categories (Personal, Inner Peace, Health, Family, Career, Fun)
- **Weekly Cycles**: Automatic weekly goal reset system based on Monday start dates
- **Selection Rules**: Users must select exactly 2 goals per category each week
- **Progress Tracking**: Real-time completion status with achievement level calculations
- **Achievement Levels**: Tiered achievement system based on category completion counts

### Application Structure
- **Monorepo Design**: Shared schema and types between client and server
- **Type Safety**: End-to-end TypeScript with shared type definitions
- **Component Architecture**: Reusable UI components with consistent design patterns
- **Responsive Design**: Mobile-first approach with adaptive layouts

## External Dependencies

### Cloud Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Replit Auth**: OAuth authentication service integration

### UI and Styling
- **Radix UI**: Headless UI primitives for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **Font Awesome**: Additional icon set for category representations

### Development Tools
- **Drizzle Kit**: Database schema management and migration tooling
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS compilation

### Runtime Libraries
- **React Query**: Server state management and caching layer
- **React Hook Form**: Form validation and management
- **Date-fns**: Date manipulation and formatting utilities
- **Zod**: Runtime type validation and schema definitions

### Development Environment
- **Vite Plugins**: Replit-specific development tools including error overlays and development banners
- **TypeScript**: Static type checking across the entire application stack