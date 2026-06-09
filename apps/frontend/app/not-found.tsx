export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-4xl font-bold text-primary mb-4">404 - Sahifa topilmadi</h2>
      <p className="text-text-muted mb-8">Kechirasiz, siz qidirayotgan sahifa mavjud emas.</p>
      <a href="/" className="btn-primary px-6 py-2">Bosh sahifaga qaytish</a>
    </div>
  );
}
