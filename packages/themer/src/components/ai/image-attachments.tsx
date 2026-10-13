// The AI chat's image thumbnails, shared by a sent message (read-only) and the
// prompt input (each image removable).
//
// Contract: nothing renders without images, and `onRemove` is what makes the
// strip editable. Each remove button is named by its image's position
// ("Remove image 2"): a bare icon button was announced as nothing. The images
// are data URLs that can repeat, so a thumbnail's key is its position.

import { X } from "lucide-react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentGroup,
  AttachmentMedia,
} from "@villa/ui/components/attachment";

interface ImageAttachmentsProps {
  /** The images as data URLs. */
  images: readonly string[] | undefined;
  /** Start of each thumbnail's alt text, followed by its position. */
  altPrefix: string;
  /** Removes the image at a position; without it the strip is read-only. */
  onRemove?: (index: number) => void;
}

/**
 * The AI chat's image thumbnails: the images a sent message carried, or the
 * ones the prompt input holds (each with a remove action). Nothing when empty.
 */
export function ImageAttachments({
  images,
  altPrefix,
  onRemove,
}: ImageAttachmentsProps) {
  if (!images?.length) return null;

  return (
    <AttachmentGroup>
      {images.map((src, index) => (
        <Attachment
          // react-doctor-disable-next-line react-doctor/no-array-index-as-key -- the images are bare data URLs that can repeat (the same image attached twice); a sent message's never change, the prompt input's are removed by position (removeImage(index)), and the thumbnails hold no state, so the slot is the identity
          key={index}
          orientation="vertical"
          size="xs"
        >
          <AttachmentMedia variant="image">
            <img src={src} alt={`${altPrefix} ${index + 1}`} />
          </AttachmentMedia>
          {onRemove ? (
            <AttachmentActions>
              <AttachmentAction
                aria-label={`Remove image ${index + 1}`}
                onClick={() => onRemove(index)}
              >
                <X />
              </AttachmentAction>
            </AttachmentActions>
          ) : null}
        </Attachment>
      ))}
    </AttachmentGroup>
  );
}
