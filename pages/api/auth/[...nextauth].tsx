import NextAuth from 'next-auth'
import Providers from 'next-auth/providers'
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from '../../../src/prismaClient'

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    Providers.Discord({
      scope: "identify",
      clientId: process.env.DISCORD_ID,
      clientSecret: process.env.DISCORD_SECRET,
    }),
    // ...add more providers here
  ],
  adapter: PrismaAdapter(prisma)
})