import 'dotenv/config';
import { hash } from 'bcryptjs';
import dataSource from '../config/db/typeorm.datasource';
import { UserEntity } from '../modules/users/entities/user.entity';
import { RoleEntity } from '../modules/users/entities/role.entity';
import { RoleCode } from '../modules/users/enums/role.enum';
import { MemberProfileEntity } from '../modules/users/entities/member-profile.entity';
import { UserStatusEntity } from '../modules/users/entities/user-status.entity';
import { StatusCatalogEntity } from '../modules/users/entities/status-catalog.entity';
import { UserStatusCode } from '../modules/users/enums/status.enum';

const seedUser = {
  email: 'minhnhieu50@gmail.com',
  username: 'much',
  password: '12345678',
};

async function run() {
  await dataSource.initialize();

  const usersRepo = dataSource.getRepository(UserEntity);
  const rolesRepo = dataSource.getRepository(RoleEntity);
  const membersRepo = dataSource.getRepository(MemberProfileEntity);
  const statusesRepo = dataSource.getRepository(UserStatusEntity);
  const statusCatalogRepo = dataSource.getRepository(StatusCatalogEntity);

  const memberRole = await rolesRepo.findOne({ where: { code: RoleCode.MEMBER } });
  if (!memberRole) {
    throw new Error('Role MEMBER is missing. Run seed:roles-statuses first.');
  }

  const activeStatus = await statusCatalogRepo.findOne({ where: { code: UserStatusCode.ACTIVE } });
  if (!activeStatus) {
    throw new Error('Status ACTIVE is missing. Run seed:roles-statuses first.');
  }

  let memberProfile = await membersRepo.findOne({
    where: [{ email: seedUser.email }, { username: seedUser.username }],
    relations: ['user'],
  });

  let userId: string;
  if (!memberProfile) {
    const user = await usersRepo.save(usersRepo.create({ roleId: memberRole.id }));
    const passwordHash = await hash(seedUser.password, 12);
    memberProfile = await membersRepo.save(
      membersRepo.create({
        userId: user.id,
        email: seedUser.email,
        username: seedUser.username,
        passwordHash,
      }),
    );
    userId = user.id;
    console.log(`Created member user: ${seedUser.email}`);
  } else {
    userId = memberProfile.userId;

    if (memberProfile.email !== seedUser.email || memberProfile.username !== seedUser.username) {
      throw new Error('Seed user identity conflicts with an existing account.');
    }

    const existingUser = await usersRepo.findOne({ where: { id: userId } });
    if (!existingUser) {
      throw new Error('Member profile exists but user record is missing.');
    }
    if (existingUser.roleId !== memberRole.id) {
      existingUser.roleId = memberRole.id;
      await usersRepo.save(existingUser);
      console.log(`Updated role to MEMBER for user: ${seedUser.email}`);
    }

    console.log(`Seed member already exists: ${seedUser.email}`);
  }

  const activeUserStatus = await statusesRepo.findOne({
    where: { userId, statusCode: UserStatusCode.ACTIVE },
  });

  if (!activeUserStatus) {
    await statusesRepo.save(
      statusesRepo.create({
        userId,
        statusCode: UserStatusCode.ACTIVE,
        isActive: true,
        source: 'seed-user',
      }),
    );
    console.log(`Assigned ACTIVE status for user: ${seedUser.email}`);
  } else if (!activeUserStatus.isActive) {
    activeUserStatus.isActive = true;
    activeUserStatus.source = 'seed-user';
    await statusesRepo.save(activeUserStatus);
    console.log(`Re-activated ACTIVE status for user: ${seedUser.email}`);
  } else {
    console.log(`ACTIVE status already assigned: ${seedUser.email}`);
  }

  await dataSource.destroy();
}

run()
  .then(() => {
    console.log('Seed user completed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
