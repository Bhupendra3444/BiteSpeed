import prisma from "../db";

// Infer the Contact type from Prisma client
type Contact = {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: "primary" | "secondary";
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

interface IdentifyRequest {
  email?: string | null;
  phoneNumber?: string | null;
}

interface IdentifyResponse {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export async function identifyContact(
  request: IdentifyRequest
): Promise<IdentifyResponse> {
  const { email, phoneNumber } = request;

  // Validate that at least one of email or phoneNumber is provided
  if (!email && !phoneNumber) {
    throw new Error("At least one of email or phoneNumber must be provided");
  }

  // Step 1: Find all contacts that match either email or phoneNumber
  const matchingContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        ...(email ? [{ email }] : []),
        ...(phoneNumber ? [{ phoneNumber: String(phoneNumber) }] : []),
      ],
    },
  });

  // Step 2: If no matching contacts, create a new primary contact
  if (matchingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email: email ?? null,
        phoneNumber: phoneNumber ? String(phoneNumber) : null,
        linkPrecedence: "primary" as const,
        linkedId: null,
      },
    });

    return buildResponse([newContact]);
  }

  // Step 3: Collect all primary contact IDs from matching contacts
  const primaryIds = new Set<number>();

  for (const contact of matchingContacts) {
    if (contact.linkPrecedence === "primary") {
      primaryIds.add(contact.id);
    } else if (contact.linkedId !== null) {
      primaryIds.add(contact.linkedId);
    }
  }

  // Step 4: Fetch all full clusters (primary + their secondaries) for found primary IDs
  let allClusterContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: { in: Array.from(primaryIds) } },
        { linkedId: { in: Array.from(primaryIds) } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // Step 5: Determine the true oldest primary among all clusters
  const primaries = allClusterContacts.filter(
    (c: Contact) => c.linkPrecedence === "primary"
  );

  // Sort primaries by createdAt ascending — oldest first
  primaries.sort(
    (a: Contact, b: Contact) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const truePrimary = primaries[0];

  // Step 6: If there are multiple primaries, merge — newer primaries become secondary
  if (primaries.length > 1) {
    const primariesToDemote = primaries.slice(1);

    for (const oldPrimary of primariesToDemote) {
      // Update the old primary to become secondary
      await prisma.contact.update({
        where: { id: oldPrimary.id },
        data: {
          linkedId: truePrimary.id,
          linkPrecedence: "secondary" as const,
          updatedAt: new Date(),
        },
      });

      // Update all secondaries linked to the old primary to point to truePrimary
      await prisma.contact.updateMany({
        where: {
          linkedId: oldPrimary.id,
          deletedAt: null,
        },
        data: {
          linkedId: truePrimary.id,
          updatedAt: new Date(),
        },
      });
    }

    // Re-fetch the full updated cluster
    allClusterContacts = await prisma.contact.findMany({
      where: {
        deletedAt: null,
        OR: [{ id: truePrimary.id }, { linkedId: truePrimary.id }],
      },
      orderBy: { createdAt: "asc" },
    });
  }

  // Step 7: Check if the incoming request has new information not yet stored
  const normalizedPhone = phoneNumber ? String(phoneNumber) : null;
  const existingEmails = new Set(
    allClusterContacts.map((c: Contact) => c.email).filter(Boolean)
  );
  const existingPhones = new Set(
    allClusterContacts.map((c: Contact) => c.phoneNumber).filter(Boolean)
  );

  const hasNewEmail = email && !existingEmails.has(email);
  const hasNewPhone = normalizedPhone && !existingPhones.has(normalizedPhone);

  if (hasNewEmail || hasNewPhone) {
    // Create a new secondary contact with the new info
    const newSecondary = await prisma.contact.create({
      data: {
        email: email ?? null,
        phoneNumber: normalizedPhone,
        linkedId: truePrimary.id,
        linkPrecedence: "secondary" as const,
      },
    });

    allClusterContacts.push(newSecondary);
  }

  return buildResponse(allClusterContacts);
}

function buildResponse(contacts: Contact[]): IdentifyResponse {
  // Find the primary contact
  const primary = contacts.find(
    (c: Contact) => c.linkPrecedence === "primary"
  );

  if (!primary) {
    throw new Error("No primary contact found — data inconsistency");
  }

  // Build ordered lists: primary's info first, then secondaries in order
  const secondaries = contacts
    .filter((c: Contact) => c.linkPrecedence === "secondary")
    .sort((a: Contact, b: Contact) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Emails: primary's first, then secondary emails (deduped)
  const emailsOrdered: string[] = [];
  if (primary.email) emailsOrdered.push(primary.email);
  for (const c of secondaries) {
    if (c.email && !emailsOrdered.includes(c.email)) {
      emailsOrdered.push(c.email);
    }
  }

  // PhoneNumbers: primary's first, then secondary phones (deduped)
  const phonesOrdered: string[] = [];
  if (primary.phoneNumber) phonesOrdered.push(primary.phoneNumber);
  for (const c of secondaries) {
    if (c.phoneNumber && !phonesOrdered.includes(c.phoneNumber)) {
      phonesOrdered.push(c.phoneNumber);
    }
  }

  const secondaryContactIds = secondaries.map((c) => c.id);

  return {
    contact: {
      primaryContatctId: primary.id,
      emails: emailsOrdered,
      phoneNumbers: phonesOrdered,
      secondaryContactIds,
    },
  };
}
