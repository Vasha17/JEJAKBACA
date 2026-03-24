export function StoryDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="h-48 sm:h-64 bg-secondary"/>
      <div className="relative px-8 sm:px-6 -mt-24 flex flex-row gap-4 sm:gap-6 items-center">
        <div className="w-52 sm:w-44 shrink-0 z-10">
          <div className="aspect-[3/4] rounded-lg bg-secondary/80 border-2 border-border shadow-xl"/>
          <div className="flex gap-1 mt-2 justify-center">
            <div className="h-4 w-16 bg-secondary rounded"/>
          </div>
        </div>
        <div className="flex-1 z-10 pb-2 sm:pt-8 space-y-3">
          <div className="h-8 bg-secondary rounded w-3/4"/>
          <div className="h-4 bg-secondary/60 rounded w-1/2"/>
          <div className="h-4 bg-secondary/60 rounded w-1/3"/>
          <div className="h-px bg-border/50 w-full mt-2"/>
          <div className="flex gap-2 mt-2">
            <div className="h-6 w-20 bg-secondary rounded"/>
            <div className="h-6 w-24 bg-secondary rounded"/>
          </div>
          <div className="grid grid-cols-5 gap-3 mt-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-secondary rounded-xl"/>
            ))}
          </div>
        </div>
      </div>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 mt-12">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <div className="rounded-xl bg-secondary/50 h-32"/>
            <div className="space-y-2">
              <div className="h-4 bg-secondary rounded w-1/4"/>
              <div className="h-4 bg-secondary/60 rounded w-full"/>
              <div className="h-4 bg-secondary/60 rounded w-5/6"/>
            </div>
          </div>
          <div className="lg:w-80 space-y-3">
            <div className="h-6 bg-secondary rounded w-1/2"/>
            <div className="h-20 bg-secondary/50 rounded-xl"/>
            <div className="h-20 bg-secondary/50 rounded-xl"/>
          </div>
        </div>
      </div>
    </div>
  );
}