import { create } from 'zustand';

type TripView = 'recommendations' | 'itinerary';

interface TripViewState {
  view: TripView;
  setView: (view: TripView) => void;
  initialize: (initialActivities: number) => void;
}

const useTripViewStore = create<TripViewState>(set => ({
  view: 'itinerary',
  totalActivities: 0,
  setView: view => set({ view }),
  initialize: initialActivities =>
    set({
      view: initialActivities > 0 ? 'itinerary' : 'recommendations',
    }),
}));

export const useTripView = () => {
  const store = useTripViewStore();

  return {
    view: store.view,
    setView: store.setView,
    initialize: store.initialize,
  };
};
