import { OAuth2Client } from "googleapis-common";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const app = await prisma.app.findUnique({ where: { slug: "google-calendar" } });
  const keys = app?.keys as any;
  if (!keys) {
    console.log("No keys in DB");
    return;
  }
  
  const client_id = keys.client_id;
  const client_secret = keys.client_secret;
  const redirect_uri = "http://localhost:3000/api/integrations/googlecalendar/callback";
  
  const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uri);
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/userinfo.profile"],
    prompt: "consent",
    state: "test_state",
  });
  console.log("Generated Auth URL:");
  console.log(authUrl);
}

run().catch(console.error).finally(() => prisma.$disconnect());
