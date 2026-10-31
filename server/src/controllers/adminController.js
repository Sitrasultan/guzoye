import Guide from '../models/Guide.js';
import { ApiError } from '../middleware/errors.js';
import { pagination, enumValue } from '../middleware/validate.js';
export async function listApplications(req, res) {
  const { page, limit } = pagination(req.query);
  const status = enumValue(req.query.status, ['pending', 'approved'], 'status') || 'pending';
  const filter = { status };
  const [data, total] = await Promise.all([
    Guide.find(filter).sort({ createdAt: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name email role').lean(),
    Guide.countDocuments(filter)
  ]);
  res.json({ data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
}
export async function approveGuide(req, res) {
  // :id is the Guide document ID, not the User ID. Repeated approval is idempotent.
  let guide = await Guide.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, {
    $set: { status: 'approved', approvedAt: new Date(), approvedBy: req.user._id }
  }, { new: true, runValidators: true }).populate('user', 'name email role');
  if (!guide) guide = await Guide.findById(req.params.id).populate('user', 'name email role');
  if (!guide) throw new ApiError(404, 'Guide application not found.');
  res.json({ data: guide, message: 'Guide approved.' });
}
