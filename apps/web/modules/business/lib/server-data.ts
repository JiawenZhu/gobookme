import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

export async function getAdminEventTypeOptions() {
  return await prisma.eventType.findMany({
    where: {
      hidden: false,
    },
    orderBy: [{ title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
    },
  });
}

export async function getOwnerEventTypeOptions(userId: number) {
  return await prisma.eventType.findMany({
    where: {
      hidden: false,
      OR: [
        { userId },
        {
          team: {
            members: {
              some: {
                userId,
                role: {
                  in: [MembershipRole.OWNER, MembershipRole.ADMIN],
                },
              },
            },
          },
        },
      ],
    },
    orderBy: [{ title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
    },
  });
}
