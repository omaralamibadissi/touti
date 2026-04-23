// Wrapper autour d'Avatar qui résout la photo via usePhotoOf(username).
// Intention : remplacer tous les <Avatar initials={X[0]} …> par
// <PhotoAvatar username={X} …> pour que la photo s'affiche partout où un
// user est représenté (amis, ligue, tournoi, chat, match, etc.).

import React from "react";
import { Avatar } from "./Avatar";
import { usePhotoOf } from "../store/photosStore";

interface Props {
  username: string | null | undefined;
  size?: number;
  color?: string;
  online?: boolean;
  ring?: boolean;
  // Si `initials` est fourni, on l'utilise ; sinon, on prend la 1ère lettre
  // de username en fallback.
  initials?: string;
}

export function PhotoAvatar({ username, initials, ...rest }: Props) {
  const photo = usePhotoOf(username);
  const name = (username || "").trim();
  const finalInitials = initials ?? (name[0]?.toUpperCase() ?? "?");
  return <Avatar initials={finalInitials} photo={photo} {...rest} />;
}
