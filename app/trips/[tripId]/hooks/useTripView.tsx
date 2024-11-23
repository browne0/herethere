import { create } from 'zustand';

type TripView = 'recommendations' | 'itinerary';

interface TripViewState {
  view: TripView;
  setView: (view: TripView) => void;
  initialize: (view: string) => void;
}

const useTripViewStore = create<TripViewState>(set => ({
  view: 'recommendations',
  setView: view => set({ view }),
  initialize: () =>
    set({
      view: 'recommendations',
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
