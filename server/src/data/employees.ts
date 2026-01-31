// Mock employee data for demonstration purposes

import { z } from 'zod';
import { registry, createDataSource } from './registry.js';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  title: string;
  salary: number;
  hireDate: string;
  location: string;
  manager: string | null;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
}

// Sample data pools
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
];

const departments = [
  'Engineering', 'Sales', 'Marketing', 'Finance', 'HR', 'Operations', 'Legal', 'Product'
];

const titles = {
  Engineering: ['Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager', 'Tech Lead'],
  Sales: ['Sales Representative', 'Senior Sales Rep', 'Account Executive', 'Sales Manager', 'Sales Director'],
  Marketing: ['Marketing Coordinator', 'Marketing Manager', 'Content Strategist', 'Brand Manager', 'CMO'],
  Finance: ['Financial Analyst', 'Senior Analyst', 'Finance Manager', 'Controller', 'CFO'],
  HR: ['HR Coordinator', 'HR Specialist', 'HR Manager', 'Recruiter', 'HR Director'],
  Operations: ['Operations Analyst', 'Operations Manager', 'Project Manager', 'COO', 'Facilities Manager'],
  Legal: ['Legal Assistant', 'Paralegal', 'Corporate Counsel', 'General Counsel', 'Legal Director'],
  Product: ['Product Manager', 'Senior PM', 'Product Director', 'UX Designer', 'Product Analyst'],
};

const locations = ['New York', 'San Francisco', 'Chicago', 'Austin', 'Seattle', 'Boston', 'Denver', 'Remote'];

const salaryRanges: Record<string, [number, number]> = {
  Engineering: [80000, 200000],
  Sales: [60000, 180000],
  Marketing: [55000, 150000],
  Finance: [70000, 180000],
  HR: [50000, 130000],
  Operations: [55000, 140000],
  Legal: [75000, 220000],
  Product: [85000, 190000],
};

// Helper functions
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(startYear: number, endYear: number): string {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function randomSalary(dept: string): number {
  const [min, max] = salaryRanges[dept] || [50000, 100000];
  return Math.round((min + Math.random() * (max - min)) / 1000) * 1000;
}

// Generate employees
function generateEmployees(count: number): Employee[] {
  const employees: Employee[] = [];
  const managers: string[] = [];
  
  for (let i = 1; i <= count; i++) {
    const firstName = randomFrom(firstNames);
    const lastName = randomFrom(lastNames);
    const department = randomFrom(departments);
    const deptTitles = titles[department as keyof typeof titles] || ['Employee'];
    const title = randomFrom(deptTitles);
    const isManager = title.includes('Manager') || title.includes('Director') || title.includes('Lead');
    
    const employee: Employee = {
      id: `EMP-${String(i).padStart(4, '0')}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
      department,
      title,
      salary: randomSalary(department),
      hireDate: randomDate(2015, 2024),
      location: randomFrom(locations),
      manager: managers.length > 0 && !isManager ? randomFrom(managers) : null,
      status: Math.random() > 0.1 ? 'ACTIVE' : (Math.random() > 0.5 ? 'ON_LEAVE' : 'TERMINATED'),
    };
    
    if (isManager) {
      managers.push(employee.id);
    }
    
    employees.push(employee);
  }
  
  return employees.sort((a, b) => a.lastName.localeCompare(b.lastName));
}

// Generate 50 employees
export const employees: Employee[] = generateEmployees(50);

// Query function
export interface EmployeeQuery {
  firstName?: string;
  lastName?: string;
  department?: string;
  title?: string;
  location?: string;
  status?: Employee['status'];
  minSalary?: number;
  maxSalary?: number;
}

export function queryEmployees(query: EmployeeQuery): Employee[] {
  return employees.filter(emp => {
    if (query.firstName && !emp.firstName.toLowerCase().includes(query.firstName.toLowerCase())) return false;
    if (query.lastName && !emp.lastName.toLowerCase().includes(query.lastName.toLowerCase())) return false;
    if (query.department && emp.department !== query.department) return false;
    if (query.title && !emp.title.toLowerCase().includes(query.title.toLowerCase())) return false;
    if (query.location && emp.location !== query.location) return false;
    if (query.status && emp.status !== query.status) return false;
    if (query.minSalary && emp.salary < query.minSalary) return false;
    if (query.maxSalary && emp.salary > query.maxSalary) return false;
    return true;
  });
}

// Statistics
export function getEmployeeStats(data: Employee[]) {
  const byDepartment: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const salaryByDept: Record<string, { total: number; count: number }> = {};
  
  let totalSalary = 0;
  
  for (const emp of data) {
    totalSalary += emp.salary;
    byDepartment[emp.department] = (byDepartment[emp.department] || 0) + 1;
    byLocation[emp.location] = (byLocation[emp.location] || 0) + 1;
    byStatus[emp.status] = (byStatus[emp.status] || 0) + 1;
    
    if (!salaryByDept[emp.department]) {
      salaryByDept[emp.department] = { total: 0, count: 0 };
    }
    salaryByDept[emp.department].total += emp.salary;
    salaryByDept[emp.department].count += 1;
  }
  
  return {
    totalEmployees: data.length,
    avgSalary: data.length > 0 ? Math.round(totalSalary / data.length) : 0,
    byDepartment,
    byLocation,
    byStatus,
    avgSalaryByDept: Object.entries(salaryByDept).map(([dept, data]) => ({
      name: dept,
      salary: Math.round(data.total / data.count),
    })),
  };
}

// Register with the registry
const employeesDataSource = createDataSource<Employee>({
  name: 'employees',
  description: 'Employee directory with department, salary, and location information',
  
  filterSchema: z.object({
    firstName: z.string().optional().describe('Filter by first name'),
    lastName: z.string().optional().describe('Filter by last name'),
    department: z.enum(['Engineering', 'Sales', 'Marketing', 'Finance', 'HR', 'Operations', 'Legal', 'Product']).optional(),
    title: z.string().optional().describe('Filter by job title'),
    location: z.string().optional().describe('Filter by office location'),
    status: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED']).optional(),
    minSalary: z.number().optional().describe('Minimum salary'),
    maxSalary: z.number().optional().describe('Maximum salary'),
  }),
  
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'department', label: 'Department' },
    { key: 'title', label: 'Title' },
    { key: 'salary', label: 'Salary' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
  ],
  
  chartAggregations: [
    { key: 'byDepartment', label: 'Employees by Department', xKey: 'name', yKey: 'count', recommendedType: 'bar' },
    { key: 'byLocation', label: 'Employees by Location', xKey: 'name', yKey: 'count', recommendedType: 'bar' },
    { key: 'byStatus', label: 'Employees by Status', xKey: 'name', yKey: 'count', recommendedType: 'pie' },
    { key: 'avgSalaryByDept', label: 'Average Salary by Department', xKey: 'name', yKey: 'salary', recommendedType: 'bar' },
  ],
  
  query: (filters) => queryEmployees(filters as EmployeeQuery),
  
  aggregate: (data, aggregationType) => {
    const stats = getEmployeeStats(data);
    
    switch (aggregationType) {
      case 'byDepartment':
        return Object.entries(stats.byDepartment)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
      case 'byLocation':
        return Object.entries(stats.byLocation)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
      case 'byStatus':
        return Object.entries(stats.byStatus)
          .map(([name, count]) => ({ name, count }));
      case 'avgSalaryByDept':
        return stats.avgSalaryByDept.sort((a, b) => b.salary - a.salary);
      default:
        return [];
    }
  },
  
  getSummary: (data) => {
    const stats = getEmployeeStats(data);
    return {
      totalEmployees: stats.totalEmployees,
      avgSalary: '$' + stats.avgSalary.toLocaleString(),
      activeCount: stats.byStatus['ACTIVE'] || 0,
    };
  },
});

registry.register(employeesDataSource);
