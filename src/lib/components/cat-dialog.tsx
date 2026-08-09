import { useEffect, useState } from "react";
import { pickIndexWithLenUnbiased } from "../practice/random";
import Dialog from "./dialog";

import Ears from "@/assets/svgs/Results-1.svg";
import PeakUnder from "@/assets/svgs/Results-2.svg";
import DoorYarn from "@/assets/svgs/Results-3.svg";
import Sleeping from "@/assets/svgs/Results-4.svg";
import CatInteraction from "@/src/lib/components/cat-interaction";

const cats = [
  /* eslint-disable react/jsx-key*/
  <Ears
    style={{
      position: "absolute",
      left: 8,
      top: 0,
      transform: [{ translateY: "-100%" }],
    }}
    width={100}
    height={100}
  />,
  <CatInteraction
    style={{
      position: "absolute",
      right: 8,
      bottom: 1,
      transform: [{ translateY: "100%" }],
    }}
  >
    <PeakUnder width={100} height={100} />
  </CatInteraction>,
  <DoorYarn
    style={{
      position: "absolute",
      left: 8,
      bottom: 1,
      transform: [{ translateY: "100%" }],
    }}
    width={100}
    height={100}
  />,
  <CatInteraction
    style={{
      position: "absolute",
      right: 8,
      top: 52,
      transform: [{ translateY: "-100%" }],
    }}
  >
    <Sleeping width={128} height={128} />
  </CatInteraction>,
];

type Props = {
  reroll?: boolean;
  open: boolean;
  onClose?: () => void;
} & React.PropsWithChildren;

export default function CatDialog({ reroll, open, onClose, children }: Props) {
  const [catIndex, setCatIndex] = useState(() =>
    pickIndexWithLenUnbiased(cats.length),
  );

  // display a different cat when reopening after a new game ends
  useEffect(() => {
    if (!open || !reroll) {
      return;
    }

    setCatIndex(pickIndexWithLenUnbiased(cats.length));
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} allowOverflow>
      {cats[catIndex]}
      {children}
    </Dialog>
  );
}
