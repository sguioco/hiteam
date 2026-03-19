import type { WorkGroupItem } from '@smart/types';
import type { loadManagerEmployees } from './api';

type ManagerEmployee = Awaited<ReturnType<typeof loadManagerEmployees>>[number];

const MOCK_AVATARS = {
  female: [require('../assets/avatars/1.jpg'), require('../assets/avatars/3.jpg')],
  male: [require('../assets/avatars/2.jpg'), require('../assets/avatars/4.jpg'), require('../assets/avatars/5.jpg')],
};

const MOCK_EMPLOYEES_SOURCE = [
  ['employee-1', 'Artem', 'Sokolov', 'ART-1001', 'Programmers', 'Frontend Developer', 'HQ', 'male'],
  ['employee-2', 'Nikita', 'Volkov', 'ART-1002', 'Programmers', 'Backend Developer', 'HQ', 'male'],
  ['employee-3', 'Polina', 'Smirnova', 'ART-1003', 'Programmers', 'QA Engineer', 'HQ', 'female'],
  ['employee-4', 'Elena', 'Morozova', 'ART-2001', 'Cleaners', 'Shift Cleaner', 'Mall West', 'female'],
  ['employee-5', 'Irina', 'Kuzina', 'ART-2002', 'Cleaners', 'Senior Cleaner', 'Mall West', 'female'],
  ['employee-6', 'Roman', 'Orlov', 'ART-3001', 'Support', 'Operations Coordinator', 'Downtown', 'male'],
] as const;

export function getMockManagerEmployees(): ManagerEmployee[] {
  let fIdx = 0;
  let mIdx = 0;

  return MOCK_EMPLOYEES_SOURCE.map(([id, firstName, lastName, employeeNumber, departmentName, positionName, locationName, gender], index) => {
    const avatar = gender === 'female'
      ? MOCK_AVATARS.female[fIdx++ % MOCK_AVATARS.female.length]
      : MOCK_AVATARS.male[mIdx++ % MOCK_AVATARS.male.length];

    return {
      id: `mock-${id}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@smart.demo`,
      employeeNumber,
      department: {
        id: `mock-department-${index + 1}-${departmentName.toLowerCase().replace(/\s+/g, '-')}`,
        name: departmentName,
      },
      position: {
        id: `mock-position-${index + 1}`,
        name: positionName,
      },
      primaryLocation: {
        id: `mock-location-${index + 1}`,
        name: locationName,
      },
      avatar,
    };
  });
}

export function getMockEmployeesList() {
  return getMockManagerEmployees().map((employee) => ({
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
  }));
}

export function getMockManagerGroups(employees = getMockManagerEmployees()): WorkGroupItem[] {
  const groups = [
    {
      description: 'Frontend, backend, QA',
      id: 'mock-group-programmers',
      memberMatcher: (employee: ManagerEmployee) => employee.department?.name === 'Programmers',
      name: 'Programmers',
    },
    {
      description: 'Daily cleaning crew',
      id: 'mock-group-cleaners',
      memberMatcher: (employee: ManagerEmployee) => employee.department?.name === 'Cleaners',
      name: 'Cleaners',
    },
  ] as const;

  return groups.map((group) => {
    const members = employees.filter(group.memberMatcher);

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      managerEmployeeId: 'mock-manager',
      memberships: members.map((employee, index) => ({
        id: `${group.id}-membership-${index + 1}`,
        employeeId: employee.id,
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeNumber: employee.employeeNumber,
        },
      })),
      _count: {
        tasks: 0,
      },
    };
  });
}
