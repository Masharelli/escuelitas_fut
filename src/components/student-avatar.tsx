import Image from "next/image";

export function StudentAvatar({
  name,
  surname,
  photoUrl,
  large = false,
}: {
  name: string;
  surname?: string;
  photoUrl: string | null;
  large?: boolean;
}) {
  const initials = `${name.trim().charAt(0)}${surname?.trim().charAt(0) ?? ""}`.toUpperCase();
  const size = large ? 72 : 44;
  const sizeClass = large ? "size-18 text-2xl" : "size-11 text-sm";

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        className={`${sizeClass} shrink-0 rounded-full border border-ink/10 object-cover`}
      />
    );
  }

  return (
    <span aria-hidden="true" className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-pitch/10 font-semibold text-pitch`}>
      {initials || "?"}
    </span>
  );
}
