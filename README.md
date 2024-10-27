# WanderAI

WanderAI is an AI-powered travel itinerary planner focusing on dietary restrictions and personalized experiences.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **UI Components**: shadcn/ui

## Prerequisites

Before you begin, ensure you have installed:

- Node.js (v18 or newer)
- PostgreSQL (v14 or newer)
- ngrok (for development webhook testing)
- Git

## Environment Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/WanderAI.git
cd WanderAI
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/WanderAI"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/trips
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/trips
```

4. Set up the database:

```bash
npx prisma generate
npx prisma db push
```

## Development Scripts

```bash
# Start the development server
npm run dev

# Start development server with ngrok tunnel
npm run dev:tunnel

# Build for production
npm run build

# Start production server
npm run start

# Generate Prisma client
npm run prisma:generate

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

## Server Configuration

### Development Server

- Runs on `http://localhost:3000`
- Provides hot reloading
- Run with `npm run dev`

### ngrok Tunnel

- Required for testing webhook integrations (e.g., Clerk webhooks)
- Creates a public URL for your local server
- Run with `npm run dev:tunnel`
- Note: URL changes each session unless using a paid ngrok account

### Prisma Studio

- GUI for database management
- Runs on `http://localhost:5555`
- Run with `npm run prisma:studio`

## Project Structure

```
WanderAI/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── trips/             # Trip-related pages
│   └── ...                # Other pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Custom components
├── lib/                   # Utility functions and configurations
├── prisma/               # Database schema and migrations
│   └── schema.prisma     # Prisma schema
└── scripts/              # Development scripts
```

## Authentication

This project uses Clerk for authentication. To set up:

1. Create an account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy the required keys to your `.env` file
4. Configure webhooks in the Clerk dashboard with your ngrok URL (when testing locally)

## Database Management

### Local Setup

1. Create a PostgreSQL database:

```sql
CREATE DATABASE WanderAI;
```

2. Update your DATABASE_URL in `.env`

3. Apply schema:

```bash
npx prisma db push
```

### Schema Changes

1. Modify `prisma/schema.prisma`
2. Run `npx prisma generate` to update the Prisma Client
3. Run `npx prisma db push` to update the database schema

## Working with Webhooks

When developing features that require webhooks:

1. Start the development server with ngrok:

```bash
npm run dev:tunnel
```

2. Copy the ngrok URL provided in the console
3. Update webhook URLs in respective services (e.g., Clerk dashboard)
4. Test webhook functionality

Note: The ngrok URL changes each time you restart the tunnel unless using a paid ngrok account.

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Make your changes
4. Submit a pull request

## Troubleshooting

### Common Issues

1. **Database Connection Errors**

   - Check if PostgreSQL is running
   - Verify DATABASE_URL in `.env`
   - Ensure database exists

2. **Prisma Errors**

   - Run `npx prisma generate` after schema changes
   - Restart the development server

3. **Authentication Issues**

   - Verify Clerk environment variables
   - Check webhook URLs if using ngrok

4. **ngrok Issues**
   - Ensure ngrok is installed globally
   - Check if port 3000 is available
   - Authenticate ngrok if needed

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
