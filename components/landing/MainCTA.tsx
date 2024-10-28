export function MainCTA() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 px-8 py-16 md:p-16 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute transform rotate-45 -left-1/4 -top-1/4 w-full h-full bg-white rounded-full" />
            <div className="absolute transform -rotate-45 -right-1/4 -bottom-1/4 w-full h-full bg-white rounded-full" />
          </div>

          <div className="relative text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Start Planning Your Next Adventure Today
            </h2>
            <p className="text-lg text-indigo-100 mb-8">
              Join thousands of happy travelers who have discovered the ease of AI-powered trip
              planning
            </p>
            <a
              href="#hero"
              className="px-8 py-4 bg-white text-indigo-600 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              Get Started for Free
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
