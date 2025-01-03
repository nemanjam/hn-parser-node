import { getDb } from '@/modules/database/schema';

import { DbCompanyInsert, DbMonthInsert } from '@/types/database';
import type { RunResult } from 'better-sqlite3';

/**
 * Insert a new month with companies. The only insert needed.
 * @returns {number} - Returns numberOfRowsAffected.
 */

export const saveMonth = (month: DbMonthInsert, companies: DbCompanyInsert[]): number => {
  // upsert only updatedAt for both month and company

  const upsertMonth = getDb().prepare<[string, string, string], RunResult>(
    `INSERT INTO month (name, threadId, createdAtOriginal)
       VALUES (?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET updatedAt = CURRENT_TIMESTAMP
       ON CONFLICT(threadId) DO UPDATE SET updatedAt = CURRENT_TIMESTAMP`
  );

  const upsertCompany = getDb().prepare<[string, string, string, string], RunResult>(
    `INSERT INTO company (name, commentId, createdAtOriginal, monthName)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(name, monthName) DO UPDATE SET updatedAt = CURRENT_TIMESTAMP
       ON CONFLICT(commentId) DO UPDATE SET updatedAt = CURRENT_TIMESTAMP`
  );

  let numberOfRowsAffected = 0;

  const transaction = getDb().transaction(() => {
    // Run the upsert for month
    const monthResult = upsertMonth.run(
      month.name,
      month.threadId,
      month.createdAtOriginal.toISOString()
    );
    numberOfRowsAffected += monthResult.changes;

    // Run the upsert for each company and count updated rows
    for (const company of companies) {
      const companyResult = upsertCompany.run(
        company.name,
        company.commentId,
        company.createdAtOriginal.toISOString(),
        month.name
      );
      numberOfRowsAffected += companyResult.changes;
    }
  });

  transaction();

  return numberOfRowsAffected;
};
