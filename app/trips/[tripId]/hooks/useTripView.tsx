import { create } from 'zustand';

type TripView = 'recommendations' | 'itinerary';

interface TripViewState {
  view: TripView;
  setView: (view: TripView) => void;
  totalActivities: number;
  setTotalActivities: (count: number) => void;
  initialize: (initialActivities: number) => void;
}

const useTripViewStore = create<TripViewState>(set => ({
  view: 'recommendations',
  totalActivities: 0,
  setView: view => set({ view }),
  setTotalActivities: count => set({ totalActivities: count }),
  initialize: initialActivities =>
    set({
      view: initialActivities > 0 ? 'itinerary' : 'recommendations',
      totalActivities: initialActivities,
    }),
}));

export const useTripView = () => {
  const store = useTripViewStore();

  return {
    view: store.view,
    setView: store.setView,
    totalActivities: store.totalActivities,
    setTotalActivities: store.setTotalActivities,
    initialize: store.initialize,
  };
};
