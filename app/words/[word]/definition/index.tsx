import { Span } from "@/lib/components/text";
import { useLocalSearchParams } from "expo-router";

export default function Word() {
  const { word } = useLocalSearchParams<{ word: string }>();

  return <Span>{word}</Span>;
}
