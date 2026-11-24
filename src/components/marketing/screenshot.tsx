"use client";

import Image, { type StaticImageData } from "next/image";
import { useRef } from "react";

import styles from "./recorrido.module.css";

export function Screenshot({
  image,
  alt,
  caption,
  board = false,
  portrait = false,
}: {
  image: StaticImageData;
  alt: string;
  caption: string;
  board?: boolean;
  portrait?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <figure className={`min-w-0 ${styles.reveal} ${styles.mediaReveal} ${portrait ? "mx-auto w-full max-w-64" : ""}`}>
      <div className={board ? styles.boardFrame : "rounded-2xl bg-surface-container p-3 sm:p-5"}>
        <button
          type="button"
          aria-label={`Ver ${caption.toLowerCase()} en grande`}
          aria-haspopup="dialog"
          onClick={() => dialog.current?.showModal()}
          className={`block w-full min-w-0 cursor-zoom-in rounded-lg border hover:shadow-md motion-safe:transition-shadow ${board ? styles.boardTrigger : "border-outline-variant"}`}
        >
          <Image
            src={image}
            alt={alt}
            unoptimized
            className="h-auto w-full rounded-[inherit]"
          />
        </button>
      </div>
      <figcaption className={`mt-2 text-sm ${board ? styles.boardCopy : "text-ink-soft"}`}>
        {caption}
      </figcaption>
      <dialog
        ref={dialog}
        aria-label={caption}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className={`${styles.viewer} fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-6xl overflow-y-auto rounded-2xl bg-surface p-0 text-ink backdrop:bg-ink/70`}
      >
        <div className="p-3 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3">
            <h3 className="font-display text-lg font-bold">{caption}</h3>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="md-button md-outlined"
            >
              Cerrar
            </button>
          </div>
          <Image src={image} alt={alt} unoptimized className={`mx-auto h-auto w-full rounded-lg ${portrait ? "max-w-90" : ""}`} />
          <a
            href={image.src}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex min-h-12 items-center rounded-sm text-sm font-medium text-pitch underline underline-offset-4"
          >
            Abrir imagen en otra pestaña <span aria-hidden="true" className="ml-1">↗</span>
          </a>
        </div>
      </dialog>
    </figure>
  );
}
