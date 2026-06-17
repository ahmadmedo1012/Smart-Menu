"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ShoppingCart, Check } from "lucide-react"
import { useState } from "react"

interface MenuItemCardProps {
  id: string
  name: string
  description?: string
  price: number
  currency?: string
  imageUrl?: string | null
  isAvailable?: boolean
  isAdded?: boolean
  onAddToCart?: (id: string) => void
  className?: string
}

export function MenuItemCard({
  id,
  name,
  description,
  price,
  currency = "ر.س",
  imageUrl,
  isAvailable = true,
  isAdded = false,
  onAddToCart,
  className,
}: MenuItemCardProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <Card
      size="sm"
      className={cn(
        "group/card cursor-pointer transition-all hover:shadow-md",
        !isAvailable && "opacity-60",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover/card:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted">
            <ShoppingCart className="size-8 text-muted-foreground/40" />
          </div>
        )}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <Badge variant="secondary" className="text-sm">
              غير متوفر
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="flex flex-col gap-2">
        {/* Name + Price */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-medium">{name}</h3>
          <span className="shrink-0 text-sm font-semibold text-primary">
            {price.toFixed(2)} {currency}
          </span>
        </div>

        {/* Description */}
        {description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {description}
          </p>
        )}

        {/* Add to cart */}
        {onAddToCart && (
          <Button
            variant={isAdded ? "secondary" : "default"}
            size="sm"
            className="mt-1 w-full"
            disabled={!isAvailable}
            onClick={(e) => {
              e.stopPropagation()
              onAddToCart(id)
            }}
          >
            {isAdded ? (
              <>
                <Check className="size-3.5" />
                تمت الاضافة
              </>
            ) : (
              <>
                <ShoppingCart className="size-3.5" />
                اضافة
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
