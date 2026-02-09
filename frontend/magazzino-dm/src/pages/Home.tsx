import { FiPackage } from "react-icons/fi";
import FormArticolo from "../components/FormArticolo";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background-subtle">
      <Header />

      {/* Main content */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome card */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-8 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
                <FiPackage className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Gestione Articoli
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cerca un articolo per codice o barcode per visualizzare le informazioni
                  e gestire i movimenti di magazzino.
                </p>
              </div>
            </div>
          </div>

          {/* Form articolo */}
          <FormArticolo />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
