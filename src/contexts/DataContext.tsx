import { createContext, useContext, ReactNode } from "react";
import { useDataStore } from "@/stores/dataStore";

type DataStoreType = ReturnType<typeof useDataStore>;

const DataContext = createContext<DataStoreType>({} as DataStoreType);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const store = useDataStore();
  return <DataContext.Provider value={store}>{children}</DataContext.Provider>;
};

export const useData = () => useContext(DataContext);
