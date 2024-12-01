import { db } from '@/modules/database/schema';
import { getFirstMonth, getLastMonth } from './month';

import { LineChartMultipleData } from '@/types/charts';

export const getNewOldCompaniesCountForAllMonths = (): LineChartMultipleData[] => {
  const firstMonth = getFirstMonth();
  const lastMonth = getLastMonth();

  const query = `
    WITH OrderedMonths AS (
        SELECT 
            name AS currentMonth,
            LAG(name) OVER (ORDER BY name DESC) AS previousMonth
        FROM month
    ),
    FirstTimeCompanies AS (
        SELECT 
            c1.monthName AS monthName,
            COUNT(DISTINCT c1.name) AS firstTimeCompaniesCount
        FROM company c1
        WHERE NOT EXISTS (
            SELECT 1 
            FROM company c2 
            WHERE c1.name = c2.name AND c2.monthName < c1.monthName
        )
        GROUP BY c1.monthName
    ),
    NewCompanies AS (
        SELECT 
            c1.monthName AS monthName,
            COUNT(DISTINCT c1.name) AS newCompaniesCount
        FROM company c1
        JOIN OrderedMonths om ON c1.monthName = om.currentMonth
        WHERE NOT EXISTS (
            SELECT 1 
            FROM company c2 
            WHERE c1.name = c2.name AND c2.monthName = om.previousMonth
        )
        AND EXISTS (
            SELECT 1
            FROM company c3
            WHERE c1.name = c3.name AND c3.monthName < c1.monthName
        )
        GROUP BY c1.monthName
    ),
    OldCompanies AS (
        SELECT 
            c1.monthName AS monthName,
            COUNT(DISTINCT c1.name) AS oldCompaniesCount
        FROM company c1
        JOIN OrderedMonths om ON c1.monthName = om.currentMonth
        WHERE EXISTS (
            SELECT 1 
            FROM company c2 
            WHERE c1.name = c2.name AND c2.monthName = om.previousMonth
        )
        GROUP BY c1.monthName
    ),
    AllCompanies AS (
        SELECT 
            c1.monthName AS monthName,
            COUNT(DISTINCT c1.name) AS allCompaniesCount
        FROM company c1
        GROUP BY c1.monthName
    )
    SELECT 
        om.currentMonth AS monthName,
        ftc.firstTimeCompaniesCount,
        nc.newCompaniesCount,
        oc.oldCompaniesCount,
        ac.allCompaniesCount
    FROM OrderedMonths om
    LEFT JOIN FirstTimeCompanies ftc ON om.currentMonth = ftc.monthName
    LEFT JOIN NewCompanies nc ON om.currentMonth = nc.monthName
    LEFT JOIN OldCompanies oc ON om.currentMonth = oc.monthName
    LEFT JOIN AllCompanies ac ON om.currentMonth = ac.monthName
    WHERE om.previousMonth IS NOT NULL
    ORDER BY om.currentMonth ASC;  -- Reversed order (ascending month)
`;

  const result = db.prepare<[], LineChartMultipleData>(query).all();

  return result;
};
