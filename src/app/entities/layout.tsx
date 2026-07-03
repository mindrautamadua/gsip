// Parallel route slot `@modal` hosts the intercepted entity detail as an
// overlay while the entities list stays mounted underneath.
export default function EntitiesLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
