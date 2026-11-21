"use client";

import { useState } from "react";
import { ProductImage } from "@/components/ProductBits";

export function Gallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-tile border border-paper-line bg-white">
        <ProductImage src={current?.url} alt={current?.alt || name} />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? "border-pista" : "border-transparent"}`}
            >
              <ProductImage src={img.url} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
