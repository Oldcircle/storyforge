import { compressImage } from "../../utils/image";

interface ImageUploadProps {
  value: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ value, onChange, maxImages = 6 }: ImageUploadProps) {
  const remainingSlots = Math.max(0, maxImages - value.length);

  const handleFiles = async (files: FileList | null) => {
    if (!files || remainingSlots === 0) {
      return;
    }

    const nextImages: string[] = [];
    for (const file of Array.from(files).slice(0, remainingSlots)) {
      nextImages.push(await compressImage(file));
    }

    onChange([...value, ...nextImages]);
  };

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center justify-center rounded-3xl border border-dashed border-stroke bg-bg-primary/70 px-4 py-6 text-sm text-text-secondary transition hover:border-stroke-strong hover:text-text-primary">
        <input
          accept="image/*"
          className="hidden"
          multiple={remainingSlots > 1}
          type="file"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        {remainingSlots > 0 ? `上传图片（最多 ${maxImages} 张）` : "已达到上限"}
      </label>

      {value.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {value.map((image, index) => (
            <div key={`${image.slice(0, 32)}-${index}`} className="rounded-3xl border border-stroke bg-bg-secondary/60 p-3">
              <img
                alt={`上传图片 ${index + 1}`}
                className="h-32 w-full rounded-2xl object-cover"
                src={image}
              />
              <button
                className="mt-3 w-full rounded-2xl border border-stroke px-3 py-2 text-xs text-text-secondary transition hover:text-text-primary"
                type="button"
                onClick={() => onChange(value.filter((_, imageIndex) => imageIndex !== index))}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
