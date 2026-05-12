import 'dotenv/config';
import dataSource from '../config/db/typeorm.datasource';
import { RoleEntity } from '../modules/users/entities/role.entity';
import { RoleCode } from '../modules/users/enums/role.enum';
import { StatusCatalogEntity } from '../modules/users/entities/status-catalog.entity';
import { UserStatusCode } from '../modules/users/enums/status.enum';

async function run() {
  await dataSource.initialize();
  const roleRepo = dataSource.getRepository(RoleEntity);
  const statusRepo = dataSource.getRepository(StatusCatalogEntity);

  const roles = [
    { code: RoleCode.GUEST, name: 'Guest' },
    { code: RoleCode.MEMBER, name: 'Member' },
    { code: RoleCode.ADMIN, name: 'Admin' },
  ];
  for (const role of roles) {
    const existed = await roleRepo.findOne({ where: { code: role.code } });
    if (!existed) await roleRepo.insert(role);
  }

  for (const statusCode of Object.values(UserStatusCode)) {
    const existed = await statusRepo.findOne({ where: { code: statusCode } });
    if (!existed) {
      await statusRepo.insert({ code: statusCode, displayName: statusCode });
    }
  }

  await dataSource.destroy();
}

run()
  .then(() => {
    console.log('Seed completed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
