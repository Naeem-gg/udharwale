import Contact from '@/models/Contact';
import User from '@/models/User';
import { contactMatchesIdentity } from '@/lib/ledger-access';

type TripParticipantLike = {
  id: string;
  name: string;
  isCurrentUser?: boolean;
  contactId?: string;
  phone?: string;
};

type TripLike = {
  userId: { toString(): string } | string;
  participants?: TripParticipantLike[];
};

export type TripShareViewerAccess = {
  authenticated: boolean;
  isOwner: boolean;
  isParticipant: boolean;
  /** Can mark/undo at least one settlement on this trip */
  canSettle: boolean;
  /** Participant ids this account represents */
  participantIds: string[];
  displayName: string;
};

/**
 * Resolve whether a signed-in user is the trip owner or a matched trip member.
 * Matching uses owner identity, participant phone, or linked contact phone/email/peerUserId.
 */
export async function resolveTripShareViewer(
  trip: TripLike,
  sessionUser: { id?: string | null; name?: string | null } | null | undefined
): Promise<TripShareViewerAccess> {
  if (!sessionUser?.id) {
    return {
      authenticated: false,
      isOwner: false,
      isParticipant: false,
      canSettle: false,
      participantIds: [],
      displayName: '',
    };
  }

  const isOwner = String(trip.userId) === String(sessionUser.id);
  const dbUser = await User.findById(sessionUser.id).select('name phone email');
  const displayName = (dbUser?.name || sessionUser.name || 'Member').trim() || 'Member';
  const viewerIdentity = {
    phone: dbUser?.phone || '',
    email: dbUser?.email || '',
  };

  const participants = Array.isArray(trip.participants) ? trip.participants : [];
  const matched = new Set<string>();

  if (isOwner) {
    for (const p of participants) {
      if (p.isCurrentUser) matched.add(p.id);
    }
    // Owner always counts as a settler even if no "You" row
    if (matched.size === 0 && participants[0]) matched.add(participants[0].id);
  }

  const contactIds = participants
    .map((p) => p.contactId)
    .filter((id): id is string => Boolean(id));

  const contacts =
    contactIds.length > 0
      ? await Contact.find({
          id: { $in: contactIds },
          userId: trip.userId,
        }).select('id phone email peerUserId')
      : [];

  const contactById = new Map(contacts.map((c) => [c.id, c]));

  for (const p of participants) {
    if (matched.has(p.id)) continue;

    if (p.phone && viewerIdentity.phone && contactMatchesIdentity({ phone: p.phone }, viewerIdentity)) {
      matched.add(p.id);
      continue;
    }

    if (p.contactId) {
      const contact = contactById.get(p.contactId);
      if (!contact) continue;

      if (contact.peerUserId && String(contact.peerUserId) === String(sessionUser.id)) {
        matched.add(p.id);
        continue;
      }

      if (contactMatchesIdentity(contact, viewerIdentity)) {
        matched.add(p.id);
      }
    }
  }

  const participantIds = [...matched];
  const isParticipant = isOwner || participantIds.length > 0;

  return {
    authenticated: true,
    isOwner,
    isParticipant,
    canSettle: isParticipant,
    participantIds,
    displayName,
  };
}

/** Owner may manage any settlement; members may only manage ones they owe (fromId). */
export function canManageSettlement(
  access: TripShareViewerAccess,
  settlement: { fromId?: string } | null | undefined
): boolean {
  if (!access.canSettle) return false;
  if (access.isOwner) return true;
  if (!settlement?.fromId) return false;
  return access.participantIds.includes(settlement.fromId);
}
