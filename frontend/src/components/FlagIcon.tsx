import { Image } from "expo-image";
import React from "react";

import { flagUrl } from "@/src/constants/languages";

interface FlagIconProps {
  code?: string | null;
  size?: number;
  testID?: string;
}

/** Round flag image (HelloTalk-style) for a language code. */
export const FlagIcon: React.FC<FlagIconProps> = ({
  code,
  size = 18,
  testID,
}) => (
  <Image
    testID={testID}
    source={{ uri: flagUrl(code) }}
    style={{ width: size, height: size, borderRadius: size / 2 }}
    contentFit="cover"
    transition={100}
  />
);
