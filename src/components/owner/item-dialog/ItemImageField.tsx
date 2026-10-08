'use client';
/*
 * item-dialog/ItemImageField.tsx — round94 W2-b (inspection-c §2.4):
 * JSX moved VERBATIM from ItemDialog.tsx 532–592 (image URL input + upload
 * label + OptimizedImage preview, round88-A2 size-20 box). The async upload
 * body (553–576) moved to useImageUpload — the file input's onChange now
 * only checks the file exists and calls onUploadFile(file). The preview's
 * conditional `{image && ...}` and every className are frozen as-is.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import AnimatedUpload from '@/components/ui/upload-icon';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export function ItemImageField({
        fId,
        image,
        uploading,
        onImageChange,
        onUploadFile,
}: {
        fId: string;
        image: string;
        uploading: boolean;
        onImageChange: (v: string) => void;
        onUploadFile: (file: File) => Promise<void>;
}) {
        return (
                <div>
                        <Label htmlFor={`${fId}-image`}>الصورة</Label>
                        <div className="flex gap-2 mt-1.5">
                                <Input
                                        id={`${fId}-image`}
                                        value={image}
                                        onChange={(e) => onImageChange(e.target.value)}
                                        className="text-start flex-1"
                                        dir="ltr"
                                        placeholder="https://..."
                                        disabled={uploading}
                                />
                                <label
                                        className="size-12 rounded-lg border border-border/30 flex items-center justify-center hover:bg-accent cursor-pointer shrink-0 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/60"
                                        style={{ opacity: uploading ? 0.5 : 1, pointerEvents: uploading ? 'none' : 'auto' }}
                                >
                                        <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        void onUploadFile(file);
                                                }}
                                                disabled={uploading}
                                        />
                                        {uploading ? (
                                                <Loader2 className="size-4 text-muted-foreground animate-spin" />
                                        ) : (
                                                <AnimatedUpload className="size-4 text-muted-foreground" />
                                        )}
                                </label>
                        </div>
                        {image && (
                                <div className="mt-2 rounded-md overflow-hidden size-20 border border-border/30">
                                        {/* round88-A2: box is size-20 (80px) */}
                                        <OptimizedImage src={image} alt="" className="size-full rounded-none" skeleton={false} sizes="80px" />
                                </div>
                        )}
                </div>
        );
}
