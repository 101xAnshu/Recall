"use client";

import { createContext, useContext, useState } from "react";

export type Employee = "anshu" | "priya";

const EmployeeCtx = createContext<{
  user: Employee;
  setUser: (u: Employee) => void;
}>({ user: "anshu", setUser: () => {} });

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Employee>("anshu");
  return (
    <EmployeeCtx.Provider value={{ user, setUser }}>
      {children}
    </EmployeeCtx.Provider>
  );
}

export function useEmployee() {
  return useContext(EmployeeCtx);
}

export function employeeName(u: Employee) {
  return u === "anshu" ? "Anshu" : "Priya";
}
