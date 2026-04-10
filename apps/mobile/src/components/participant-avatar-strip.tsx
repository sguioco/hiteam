import { Image, View } from 'react-native';
import { Text } from '../../components/ui/text';

export type ParticipantAvatarItem = {
  avatar?: any;
  firstName: string;
  id: string;
  lastName: string;
};

type ParticipantAvatarStripProps = {
  participants: ParticipantAvatarItem[];
};

const MAX_VISIBLE_AVATARS = 8;
const MAX_VISIBLE_PARTICIPANTS = MAX_VISIBLE_AVATARS - 1;

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function ParticipantAvatarStrip({
  participants,
}: ParticipantAvatarStripProps) {
  if (participants.length === 0) {
    return null;
  }

  const hasOverflow = participants.length > MAX_VISIBLE_AVATARS;
  const visibleParticipants = hasOverflow
    ? participants.slice(0, MAX_VISIBLE_PARTICIPANTS)
    : participants.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = participants.length - visibleParticipants.length;

  return (
    <View className="mt-3 flex-row items-center">
      {visibleParticipants.map((participant, index) => (
        <View
          key={participant.id}
          className="h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#eef2ff]"
          style={{ marginLeft: index === 0 ? 0 : -10 }}
        >
          {participant.avatar ? (
            <Image
              source={participant.avatar}
              className="h-9 w-9 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <Text className="text-[12px] font-extrabold text-foreground">
              {getInitials(participant.firstName, participant.lastName)}
            </Text>
          )}
        </View>
      ))}

      {hasOverflow ? (
        <View
          className="h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#dfe6ff]"
          style={{ marginLeft: visibleParticipants.length === 0 ? 0 : -10 }}
        >
          <Text className="text-[11px] font-extrabold text-foreground">
            +{overflowCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

