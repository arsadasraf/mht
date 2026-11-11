import bcrypt from 'bcryptjs';
import { prisma } from '../../../config/db.config.js';

/**
 * Ensures the designated System Administrator (from process.env.ADMIN_EMAIL and process.env.ADMIN_PASSWORD)
 * is present in PostgreSQL, with their password cryptographically hashed using bcrypt (10 rounds),
 * authMethod set to 'BOTH' (allowing both Google SSO and Email/Password fallback),
 * and assigned the Super Admin role.
 */
export const bootstrapAdminAccount = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'asrafali444u@gmail.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Asraf@123';

    if (!adminEmail) {
      console.warn('⚠️ [Bootstrap] No ADMIN_EMAIL specified in environment variables.');
      return;
    }

    // 1. Ensure Super Admin role exists
    let superAdminRole = await prisma.role.findUnique({
      where: { slug: 'super-admin' }
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: {
          name: 'Super Admin',
          slug: 'super-admin',
          description: 'Complete unrestricted system access across all modules & system governance',
          allowedRoutes: ['*'],
          isSystemRole: true
        }
      });
      console.log('🛡️ [Bootstrap] Created master Super Admin role.');
    }

    // 2. Check if Admin user exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      // Create fresh Super Admin account with bcrypt encrypted password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      const newAdmin = await prisma.user.create({
        data: {
          firstName: 'Asraf',
          lastName: 'Ali',
          email: adminEmail,
          password: hashedPassword,
          roleId: superAdminRole.id,
          department: 'ADMIN',
          plantLocation: 'Main Works - Unit 1 (Bengaluru)',
          authMethod: 'BOTH',
          refreshTokenExpiry: '30d',
          isSuperAdmin: true,
          isActive: true,
          status: 'ACTIVE'
        }
      });

      console.log(`✅ [Bootstrap] Created Super Admin account: ${newAdmin.email} with encrypted password.`);
    } else {
      // Verify if existing password matches configured ADMIN_PASSWORD
      let needsPasswordUpdate = false;
      if (!existingAdmin.password) {
        needsPasswordUpdate = true;
      } else {
        const isMatch = await bcrypt.compare(adminPassword, existingAdmin.password);
        if (!isMatch) {
          needsPasswordUpdate = true;
        }
      }

      const updateData = {
        authMethod: 'BOTH',
        isActive: true,
        isSuperAdmin: true,
        status: 'ACTIVE',
        roleId: superAdminRole.id
      };

      if (needsPasswordUpdate) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(adminPassword, salt);
        console.log(`🔐 [Bootstrap] Updated encrypted password for Super Admin: ${adminEmail}`);
      }

      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: updateData
      });

      console.log(`✅ [Bootstrap] Super Admin account synchronized: ${adminEmail} (authMethod: BOTH, encrypted)`);
    }
  } catch (error) {
    console.error('❌ [Bootstrap] Failed to bootstrap admin account:', error.message);
  }
};

