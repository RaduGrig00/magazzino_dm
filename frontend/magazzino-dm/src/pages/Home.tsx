
//import TonerForecastWidget from "@/components/TonerForecastWidget";

export default function Home() {


  return (
    <div className="min-h-screen flex bg-background">
      {/* Contenuto principale */}
      <div className="flex-1 flex flex-col">

        {/* Corpo pagina */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto gradient-subtle">
          {/* Page Header */}
          <div className="page-header text-center">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              Dashboard
            </h1>
          </div>

          {/* Widget Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto mb-8">

            {/* Interventi Widget */}
        

            {/* Notifiche Widget */}
            

            {/* Modifiche Widget */}
            
            {/* Meteo Widget */}
            
          </div>

          {/* Bottone aggiungi cliente */}
          <div className="flex justify-center">
            
          </div>

          {/* Form Add Cliente */}
        </main>
      </div>
    </div>
  );
}
