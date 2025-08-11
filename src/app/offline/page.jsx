export const metadata = {
  title: "Sin conexión | Guazú",
};

export default function OfflinePage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Estás sin conexión</h1>
      <p className="mt-2 text-sm text-gray-600">
        Algunas funciones pueden no estar disponibles. Cuando vuelva la
        conexión, la app se sincronizará automáticamente.
      </p>
    </main>
  );
}
