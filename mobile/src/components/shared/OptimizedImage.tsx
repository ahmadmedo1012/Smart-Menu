import { Image as ExpoImage, type ImageProps } from "expo-image";
import { cn } from "@/lib/utils";

export interface OptimizedImageProps extends Omit<ImageProps, "source"> {
  uri: string | null | undefined;
  blurhash?: string;
  className?: string;
}

export function OptimizedImage({ uri, blurhash, className, ...props }: OptimizedImageProps) {
  if (!uri) return <ExpoImage className={cn("bg-muted", className)} {...props} />;
  return (
    <ExpoImage
      source={{ uri }}
      placeholder={blurhash ? { blurhash } : undefined}
      transition={300}
      contentFit="cover"
      cachePolicy="memory-disk"
      className={cn("bg-muted", className)}
      {...props}
    />
  );
}
