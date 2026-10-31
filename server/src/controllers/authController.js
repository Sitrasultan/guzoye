import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Guide from '../models/Guide.js';
import { ApiError } from '../middleware/errors.js';
import { issueSession, clearSession } from '../services/session.js';
// A valid precomputed cost-12 dummy hash makes unknown-email attempts do bcrypt work too.
const dummyHash = bcrypt.hashSync('not-a-user-password', 12);
export async function publicUser(user) {
  const guide = user.role === 'guide' ? await Guide.findOne({ user: user._id }).select('_id status').lean() : null;
  return { _id: user._id, name: user.name, email: user.email, role: user.role, guide };
}
export async function register(req, res) {
  const { name, email, password, role } = req.validated;
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists.');
  const user = await User.create({ name, email, password, role });
  try {
    if (role === 'guide') await Guide.create({ user: user._id, status: 'pending' });
  } catch (error) {
    // Compensate on a standalone local MongoDB; no replica-set requirement.
    await User.deleteOne({ _id: user._id });
    throw error;
  }
  issueSession(res, user);
  res.status(201).json({ data: { user: await publicUser(user) }, message: role === 'guide' ? 'Account created. Your guide application is pending admin approval.' : 'Welcome to Wondu.' });
}
export async function login(req, res) {
  const { email, password } = req.validated;
  const user = await User.findOne({ email }).select('+password +tokenVersion');
  const matches = await bcrypt.compare(password, user?.password || dummyHash);
  if (!user || !matches) throw new ApiError(401, 'Invalid email or password.');
  issueSession(res, user);
  res.json({ data: { user: await publicUser(user) }, message: 'Welcome back.' });
}
export async function logout(req, res) {
  // Revokes all existing JWTs for this user, including copied tokens.
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  clearSession(res);
  res.json({ message: 'Logged out on all devices.' });
}
export async function me(req, res) { res.json({ data: { user: await publicUser(req.user) } }); }
