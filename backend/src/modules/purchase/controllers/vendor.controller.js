import { Vendor } from '../models/vendor.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getVendors = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const query = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { vendorCode: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const vendors = await Vendor.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, count: vendors.length, vendors });
  } catch (error) {
    next(error);
  }
};

export const createVendor = async (req, res, next) => {
  try {
    const count = await Vendor.countDocuments();
    const vendorCode = `VND-${String(count + 1).padStart(4, '0')}`;

    const vendor = new Vendor({
      ...req.body,
      vendorCode,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await vendor.save();

    await logAuditEvent({
      req,
      action: 'VENDOR_CREATED',
      module: 'purchase',
      entityId: vendor._id,
      entityType: 'Vendor',
      notes: `Vendor ${vendorCode} (${vendor.name}) created.`
    });

    res.status(201).json({ success: true, message: 'Vendor created successfully.', vendor });
  } catch (error) {
    next(error);
  }
};
