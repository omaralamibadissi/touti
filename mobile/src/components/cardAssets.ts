// Cartes SVG Ronda (source vector.ma) — importées comme composants React via
// react-native-svg-transformer. Chaque fichier est un composant SVG scalable.

import React from "react";
import type { SvgProps } from "react-native-svg";
import type { Rank, Suit } from "@touti/shared";

import Oros1 from "../../assets/cards/oros-1.svg";
import Oros2 from "../../assets/cards/oros-2.svg";
import Oros3 from "../../assets/cards/oros-3.svg";
import Oros4 from "../../assets/cards/oros-4.svg";
import Oros5 from "../../assets/cards/oros-5.svg";
import Oros6 from "../../assets/cards/oros-6.svg";
import Oros7 from "../../assets/cards/oros-7.svg";
import Oros10 from "../../assets/cards/oros-10.svg";
import Oros11 from "../../assets/cards/oros-11.svg";
import Oros12 from "../../assets/cards/oros-12.svg";
import Copas1 from "../../assets/cards/copas-1.svg";
import Copas2 from "../../assets/cards/copas-2.svg";
import Copas3 from "../../assets/cards/copas-3.svg";
import Copas4 from "../../assets/cards/copas-4.svg";
import Copas5 from "../../assets/cards/copas-5.svg";
import Copas6 from "../../assets/cards/copas-6.svg";
import Copas7 from "../../assets/cards/copas-7.svg";
import Copas10 from "../../assets/cards/copas-10.svg";
import Copas11 from "../../assets/cards/copas-11.svg";
import Copas12 from "../../assets/cards/copas-12.svg";
import Espadas1 from "../../assets/cards/espadas-1.svg";
import Espadas2 from "../../assets/cards/espadas-2.svg";
import Espadas3 from "../../assets/cards/espadas-3.svg";
import Espadas4 from "../../assets/cards/espadas-4.svg";
import Espadas5 from "../../assets/cards/espadas-5.svg";
import Espadas6 from "../../assets/cards/espadas-6.svg";
import Espadas7 from "../../assets/cards/espadas-7.svg";
import Espadas10 from "../../assets/cards/espadas-10.svg";
import Espadas11 from "../../assets/cards/espadas-11.svg";
import Espadas12 from "../../assets/cards/espadas-12.svg";
import Bastos1 from "../../assets/cards/bastos-1.svg";
import Bastos2 from "../../assets/cards/bastos-2.svg";
import Bastos3 from "../../assets/cards/bastos-3.svg";
import Bastos4 from "../../assets/cards/bastos-4.svg";
import Bastos5 from "../../assets/cards/bastos-5.svg";
import Bastos6 from "../../assets/cards/bastos-6.svg";
import Bastos7 from "../../assets/cards/bastos-7.svg";
import Bastos10 from "../../assets/cards/bastos-10.svg";
import Bastos11 from "../../assets/cards/bastos-11.svg";
import Bastos12 from "../../assets/cards/bastos-12.svg";

type Key = `${Suit}-${Rank}`;

const CARDS: Record<Key, React.FC<SvgProps>> = {
  "oros-1": Oros1, "oros-2": Oros2, "oros-3": Oros3, "oros-4": Oros4, "oros-5": Oros5,
  "oros-6": Oros6, "oros-7": Oros7, "oros-10": Oros10, "oros-11": Oros11, "oros-12": Oros12,

  "copas-1": Copas1, "copas-2": Copas2, "copas-3": Copas3, "copas-4": Copas4, "copas-5": Copas5,
  "copas-6": Copas6, "copas-7": Copas7, "copas-10": Copas10, "copas-11": Copas11, "copas-12": Copas12,

  "espadas-1": Espadas1, "espadas-2": Espadas2, "espadas-3": Espadas3, "espadas-4": Espadas4,
  "espadas-5": Espadas5, "espadas-6": Espadas6, "espadas-7": Espadas7, "espadas-10": Espadas10,
  "espadas-11": Espadas11, "espadas-12": Espadas12,

  "bastos-1": Bastos1, "bastos-2": Bastos2, "bastos-3": Bastos3, "bastos-4": Bastos4,
  "bastos-5": Bastos5, "bastos-6": Bastos6, "bastos-7": Bastos7, "bastos-10": Bastos10,
  "bastos-11": Bastos11, "bastos-12": Bastos12,
};

export function getCardComponent(suit: Suit, rank: Rank): React.FC<SvgProps> {
  return CARDS[`${suit}-${rank}`];
}
