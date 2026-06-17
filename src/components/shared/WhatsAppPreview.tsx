import { cn } from "@/lib/utils"
import { Check, CheckCheck } from "lucide-react"

interface WhatsAppPreviewProps {
  message: string
  time?: string
  isSent?: boolean
  isRead?: boolean
  className?: string
}

export function WhatsAppPreview({
  message,
  time,
  isSent = true,
  isRead = false,
  className,
}: WhatsAppPreviewProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col",
        "group",
        className
      )}
    >
      <div
        className={cn(
          "relative max-w-[85%] self-start rounded-xl rounded-br-sm bg-[#dcf8c6] px-3 py-2 text-sm text-gray-800 shadow-sm",
          "dark:bg-[#005c4b] dark:text-gray-100",
          "self-end rounded-bl-sm rounded-br-xl"
        )}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {message}
        </p>
        <div className="mt-1 flex items-center justify-end gap-1">
          {time && (
            <span className="text-[10px] leading-none text-gray-500 dark:text-gray-400">
              {time}
            </span>
          )}
          {isRead ? (
            <CheckCheck className="size-3.5 text-blue-500" />
          ) : isSent ? (
            <Check className="size-3.5 text-gray-500 dark:text-gray-400" />
          ) : null}
        </div>
      </div>
    </div>
  )
}
