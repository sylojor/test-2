"use client"
import type { IEmployee, IDepartment } from "@/types"
export function AvailableEmployeesPanel({ employees, departments }: { employees: IEmployee[]; departments: IDepartment[] }) {
  return <div className="p-6 text-center text-muted-foreground">Available Employees — Coming Soon</div>
}