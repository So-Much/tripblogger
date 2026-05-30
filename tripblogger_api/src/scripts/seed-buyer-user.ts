import 'dotenv/config';
import { hash } from 'bcryptjs';
import dataSource from '../config/db/typeorm.datasource';
import { UserEntity } from '../modules/users/entities/user.entity';
import { RoleEntity } from '../modules/users/entities/role.entity';
import { RoleCode } from '../modules/users/enums/role.enum';
import { MemberProfileEntity } from '../modules/users/entities/member-profile.entity';
import { UserStatusEntity } from '../modules/users/entities/user-status.entity';
import { UserStatusCode } from '../modules/users/enums/status.enum';

/** Second member account for testing shop purchases (cannot buy own products). */
const seedBuyer = {
  email: 'buyer@tripblogger.demo',
  username: 'buyer',
  password: '12345678',
};

async function run() {
  await dataSource.initialize();

  const usersRepo = dataSource.getRepository(UserEntity);
  const rolesRepo = dataSource.getRepository(RoleEntity);
  const membersRepo = dataSource.getRepository(MemberProfileEntity);
  const statusesRepo = dataSource.getRepository(UserStatusEntity);

  const memberRole = await rolesRepo.findOne({ where: { code: RoleCode.MEMBER } });
  if (!memberRole) throw new Error('Role MEMBER missing. Run seed:roles-statuses first.');

  let profile = await membersRepo.findOne({
    where: [{ email: seedBuyer.email }, { username: seedBuyer.username }],
  });

  let userId: string;
  if (!profile) {
    const user = await usersRepo.save(usersRepo.create({ roleId: memberRole.id }));
    const passwordHash = await hash(seedBuyer.password, 12);
    profile = await membersRepo.save(
      membersRepo.create({
        userId: user.id,
        email: seedBuyer.email,
        username: seedBuyer.username,
        passwordHash,
      }),
    );
    userId = user.id;
    console.log(`Created buyer user: ${seedBuyer.email}`);
  } else {
    userId = profile.userId;
    console.log(`Buyer user already exists: ${seedBuyer.email}`);
  }

  const active = await statusesRepo.findOne({ where: { userId, statusCode: UserStatusCode.ACTIVE } });
  if (!active) {
    await statusesRepo.save(
      statusesRepo.create({
        userId,
        statusCode: UserStatusCode.ACTIVE,
        isActive: true,
        source: 'seed-buyer-user',
      }),
    );
    console.log('Assigned ACTIVE status to buyer');
  }

  await dataSource.destroy();
}

run()
  .then(() => console.log('Seed buyer user completed'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
