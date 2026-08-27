DO $$
DECLARE
  ev uuid;
  s1 uuid; s2 uuid; s3 uuid; s4 uuid; s5 uuid; s6 uuid; s7 uuid; s8 uuid; s9 uuid; s10 uuid;
  h1 uuid; h2 uuid; h3 uuid;
  r1 uuid; r2 uuid; r3 uuid;
  f1 uuid; f2 uuid; f3 uuid; f4 uuid; f5 uuid; f6 uuid;
  d1 uuid; d2 uuid; d3 uuid; d4 uuid;
  v1 uuid; v2 uuid; v3 uuid; v4 uuid;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid;
  st1 uuid; st2 uuid; st3 uuid; st4 uuid;
  i1 uuid; i2 uuid; i3 uuid; i4 uuid; i5 uuid; i6 uuid; i7 uuid; i8 uuid;
  inv1 uuid; inv2 uuid; inv3 uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.events) THEN RETURN; END IF;

  INSERT INTO public.events (name, description, venue, city, start_date, end_date, status)
  VALUES ('منتدى الرياض الدولي 2026', 'منتدى دولي يجمع نخبة المتحدثين والخبراء.', 'مركز الملك عبدالله المالي', 'الرياض', current_date + 20, current_date + 22, 'planned')
  RETURNING id INTO ev;

  INSERT INTO public.speakers (full_name, title, organization, country, email, phone) VALUES
    ('د. هند الزهراني', 'أستاذ الذكاء الاصطناعي', 'جامعة الملك سعود', 'السعودية', 'hind@example.com', '+966500000001') RETURNING id INTO s1;
  INSERT INTO public.speakers (full_name, title, organization, country, email, phone) VALUES
    ('Prof. Daniel Reyes', 'Director of Innovation', 'MIT Media Lab', 'الولايات المتحدة', 'daniel@example.com', '+14150000002') RETURNING id INTO s2;
  INSERT INTO public.speakers (full_name, title, organization, country, email, phone) VALUES
    ('م. يوسف بن عمر', 'الرئيس التنفيذي', 'شركة أفق التقنية', 'الإمارات', 'yousef@example.com', '+971500000003') RETURNING id INTO s3;
  INSERT INTO public.speakers (full_name, title, organization, country, email, phone) VALUES
    ('Dr. Amina Kone', 'Health Policy Advisor', 'WHO', 'السنغال', 'amina@example.com', '+221700000004') RETURNING id INTO s4;
  INSERT INTO public.speakers (full_name, title, organization, country, email, phone) VALUES
    ('أ. ليلى المنصور', 'خبيرة تحول رقمي', 'وزارة الاتصالات', 'السعودية', 'laila@example.com', '+966500000005') RETURNING id INTO s5;
  INSERT INTO public.speakers (full_name, title, organization, country, email, phone) VALUES
    ('Mr. Kenji Watanabe', 'Head of Robotics', 'Sony R&D', 'اليابان', 'kenji@example.com', '+81300000006') RETURNING id INTO s6;
  INSERT INTO public.speakers (full_name, title, organization, country, email, phone) VALUES
    ('أ. مشاري العتيبي', 'مستشار استثماري', 'صندوق الاستثمارات', 'السعودية', 'mishari@example.com', '+966500000007') RETURNING id INTO s7;
  INSERT INTO public.speakers (full_name, title, organization, country, email, phone) VALUES
    ('Dr. Sofia Rossi', 'Urban Design Lead', 'Politecnico di Milano', 'إيطاليا', 'sofia@example.com', '+390200000008') RETURNING id INTO s8;
  INSERT INTO public.speakers (full_name, title, organization, country, email, phone) VALUES
    ('د. عبدالله الشمري', 'باحث في الطاقة المتجددة', 'كاوست', 'السعودية', 'abdullah@example.com', '+966500000009') RETURNING id INTO s9;
  INSERT INTO public.speakers (full_name, title, organization, country, email, phone) VALUES
    ('Ms. Clara Nguyen', 'Climate Strategist', 'UNDP', 'فيتنام', 'clara@example.com', '+842800000010') RETURNING id INTO s10;

  INSERT INTO public.flights (airline, flight_number, origin, destination, departure_time, arrival_time, booking_ref) VALUES
    ('طيران الإمارات', 'EK 819', 'دبي', 'الرياض', now() + interval '19 day', now() + interval '19 day 2 hour', 'EK8192026') RETURNING id INTO f1;
  INSERT INTO public.flights (airline, flight_number, origin, destination, departure_time, arrival_time, booking_ref) VALUES
    ('لوفتهانزا', 'LH 630', 'فرانكفورت', 'الرياض', now() + interval '19 day', now() + interval '19 day 6 hour', 'LH6302026') RETURNING id INTO f2;
  INSERT INTO public.flights (airline, flight_number, origin, destination, departure_time, arrival_time, booking_ref) VALUES
    ('الخطوط السعودية', 'SV 1022', 'جدة', 'الرياض', now() + interval '19 day 3 hour', now() + interval '19 day 5 hour', 'SV10222026') RETURNING id INTO f3;
  INSERT INTO public.flights (airline, flight_number, origin, destination, departure_time, arrival_time, booking_ref) VALUES
    ('الخطوط القطرية', 'QR 1168', 'الدوحة', 'الرياض', now() + interval '20 day', now() + interval '20 day 2 hour', 'QR11682026') RETURNING id INTO f4;
  INSERT INTO public.flights (airline, flight_number, origin, destination, departure_time, arrival_time, booking_ref) VALUES
    ('الخطوط السعودية', 'SV 553', 'الرياض', 'جدة', now() + interval '22 day 6 hour', now() + interval '22 day 8 hour', 'SV5532026') RETURNING id INTO f5;
  INSERT INTO public.flights (airline, flight_number, origin, destination, departure_time, arrival_time, booking_ref) VALUES
    ('طيران الإمارات', 'EK 818', 'الرياض', 'دبي', now() + interval '22 day 9 hour', now() + interval '22 day 11 hour', 'EK8182026') RETURNING id INTO f6;

  INSERT INTO public.speaker_arrivals (event_id, speaker_id, flight_id, arrival_time, arrival_point, status, notes) VALUES
    (ev, s1, f3, now() + interval '19 day 5 hour', 'مطار الملك خالد — الصالة 1', 'scheduled', 'استقبال بروتوكولي'),
    (ev, s2, f2, now() + interval '19 day 6 hour', 'مطار الملك خالد — الصالة 3', 'scheduled', 'صالة كبار الشخصيات'),
    (ev, s3, f1, now() + interval '19 day 2 hour', 'مطار الملك خالد — الصالة 2', 'confirmed', NULL),
    (ev, s4, f4, now() + interval '20 day 2 hour', 'مطار الملك خالد — الصالة 3', 'scheduled', 'يلزم مترجم فوري'),
    (ev, s6, f1, now() + interval '19 day 2 hour', 'مطار الملك خالد — الصالة 2', 'scheduled', NULL);

  INSERT INTO public.speaker_departures (event_id, speaker_id, flight_id, departure_time, departure_point, status, notes) VALUES
    (ev, s1, f5, now() + interval '22 day 6 hour', 'مطار الملك خالد — الصالة 1', 'scheduled', NULL),
    (ev, s3, f6, now() + interval '22 day 9 hour', 'مطار الملك خالد — الصالة 2', 'scheduled', 'توصيل من الفندق قبل 3 ساعات');

  INSERT INTO public.hotels (name, city, address, phone, rating) VALUES
    ('فندق الفيصلية', 'الرياض', 'شارع العليا العام', '+966112730000', 5) RETURNING id INTO h1;
  INSERT INTO public.hotels (name, city, address, phone, rating) VALUES
    ('فندق نارسس', 'الرياض', 'طريق الملك فهد', '+966112000000', 5) RETURNING id INTO h2;
  INSERT INTO public.hotels (name, city, address, phone, rating) VALUES
    ('فندق فورسيزونز', 'الرياض', 'برج المملكة', '+966112118000', 5) RETURNING id INTO h3;

  INSERT INTO public.hotel_rooms (hotel_id, room_number, room_type, capacity, nightly_rate) VALUES (h1, '1204', 'جناح تنفيذي', 2, 1800) RETURNING id INTO r1;
  INSERT INTO public.hotel_rooms (hotel_id, room_number, room_type, capacity, nightly_rate) VALUES (h2, '905', 'غرفة ديلوكس', 2, 1100) RETURNING id INTO r2;
  INSERT INTO public.hotel_rooms (hotel_id, room_number, room_type, capacity, nightly_rate) VALUES (h3, '1502', 'جناح ملكي', 3, 3200) RETURNING id INTO r3;
  INSERT INTO public.hotel_rooms (hotel_id, room_number, room_type, capacity, nightly_rate) VALUES
    (h1, '1210', 'غرفة ديلوكس', 2, 1250),
    (h2, '910', 'جناح تنفيذي', 2, 1600),
    (h3, '1510', 'غرفة ديلوكس', 2, 1900);

  INSERT INTO public.hotel_bookings (event_id, speaker_id, hotel_id, room_id, check_in, check_out, status, notes) VALUES
    (ev, s1, h1, r1, current_date + 19, current_date + 23, 'confirmed', NULL),
    (ev, s2, h2, r2, current_date + 19, current_date + 23, 'confirmed', 'طابق مرتفع'),
    (ev, s3, h3, r3, current_date + 19, current_date + 22, 'pending', NULL);

  INSERT INTO public.drivers (full_name, phone, license_number, is_available) VALUES ('تركي العنزي', '+966550000011', 'DL-100211', true) RETURNING id INTO d1;
  INSERT INTO public.drivers (full_name, phone, license_number, is_available) VALUES ('سعود القحطاني', '+966550000012', 'DL-100212', true) RETURNING id INTO d2;
  INSERT INTO public.drivers (full_name, phone, license_number, is_available) VALUES ('ماجد الدوسري', '+966550000013', 'DL-100213', false) RETURNING id INTO d3;
  INSERT INTO public.drivers (full_name, phone, license_number, is_available) VALUES ('فهد الغامدي', '+966550000014', 'DL-100214', true) RETURNING id INTO d4;

  INSERT INTO public.vehicles (plate_number, make, model, capacity, is_available) VALUES ('ر ط ح 4521', 'مرسيدس', 'S-Class', 3, true) RETURNING id INTO v1;
  INSERT INTO public.vehicles (plate_number, make, model, capacity, is_available) VALUES ('أ ب ج 1180', 'جي إم سي', 'Yukon', 6, true) RETURNING id INTO v2;
  INSERT INTO public.vehicles (plate_number, make, model, capacity, is_available) VALUES ('س ع ن 3390', 'تويوتا', 'Hiace', 12, false) RETURNING id INTO v3;
  INSERT INTO public.vehicles (plate_number, make, model, capacity, is_available) VALUES ('ك ل م 7742', 'لكزس', 'ES', 3, true) RETURNING id INTO v4;

  INSERT INTO public.transport_trips (event_id, speaker_id, driver_id, vehicle_id, trip_type, pickup_location, dropoff_location, scheduled_at, status, notes) VALUES
    (ev, s1, d1, v1, 'airport_pickup', 'مطار الملك خالد', 'فندق الفيصلية', now() + interval '19 day 5 hour', 'scheduled', NULL),
    (ev, s2, d2, v2, 'airport_pickup', 'مطار الملك خالد', 'فندق نارسس', now() + interval '19 day 6 hour', 'scheduled', NULL),
    (ev, s3, d4, v4, 'hotel_to_venue', 'فندق فورسيزونز', 'مركز الملك عبدالله المالي', now() + interval '20 day 7 hour', 'scheduled', 'قبل الجلسة الافتتاحية'),
    (ev, s1, d1, v1, 'venue_to_hotel', 'مركز الملك عبدالله المالي', 'فندق الفيصلية', now() + interval '20 day 14 hour', 'scheduled', NULL);

  INSERT INTO public.request_categories (name, description) VALUES ('ترجمة فورية', 'طلبات المترجمين واللغات')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id INTO c1;
  INSERT INTO public.request_categories (name, description) VALUES ('تجهيزات تقنية', 'أجهزة عرض وصوت وحاسب')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id INTO c2;
  INSERT INTO public.request_categories (name, description) VALUES ('خدمات طبية', 'احتياجات صحية وطبية')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id INTO c3;
  INSERT INTO public.request_categories (name, description) VALUES ('احتياجات غذائية', 'وجبات خاصة وحساسية طعام')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id INTO c4;

  INSERT INTO public.speaker_requests (event_id, speaker_id, category_id, title, details, priority, status) VALUES
    (ev, s4, c1, 'مترجم فوري فرنسي/عربي', 'مطلوب أثناء الجلسة الرئيسية.', 'high', 'in_progress'),
    (ev, s5, c2, 'شاشة عرض إضافية', 'عرض تفاعلي أثناء الورشة.', 'medium', 'open'),
    (ev, s2, c4, 'وجبة نباتية', 'خلال جميع أيام الفعالية.', 'low', 'done'),
    (ev, s6, c3, 'كشف طبي احترازي', 'ترتيب زيارة طبيب في الفندق.', 'high', 'open');

  INSERT INTO public.staff (full_name, job_title, department, phone, email) VALUES ('ريم الحربي', 'منسقة استقبال', 'المطار', '+966550000021', 'reem@event.sa') RETURNING id INTO st1;
  INSERT INTO public.staff (full_name, job_title, department, phone, email) VALUES ('خالد السبيعي', 'مشرف نقل', 'النقل', '+966550000022', 'khaled@event.sa') RETURNING id INTO st2;
  INSERT INTO public.staff (full_name, job_title, department, phone, email) VALUES ('منى الصالح', 'مسؤولة إقامة', 'الفنادق', '+966550000023', 'mona@event.sa') RETURNING id INTO st3;
  INSERT INTO public.staff (full_name, job_title, department, phone, email) VALUES ('بندر الرشيد', 'مسؤول تشغيل', 'موقع الفعالية', '+966550000024', 'bandar@event.sa') RETURNING id INTO st4;

  INSERT INTO public.staff_assignments (event_id, staff_id, role_in_event, shift_start, shift_end, notes) VALUES
    (ev, st1, 'استقبال المطار', now() + interval '19 day 4 hour', now() + interval '19 day 12 hour', NULL),
    (ev, st2, 'إدارة أسطول النقل', now() + interval '19 day 5 hour', now() + interval '19 day 15 hour', NULL),
    (ev, st3, 'تسجيل دخول الفنادق', now() + interval '19 day 6 hour', now() + interval '19 day 16 hour', NULL),
    (ev, st4, 'تشغيل القاعات', now() + interval '20 day 6 hour', now() + interval '20 day 18 hour', 'القاعة الرئيسية');

  INSERT INTO public.speaker_sessions (event_id, speaker_id, session_title, hall, starts_at, ends_at, notes) VALUES
    (ev, s1, 'مستقبل الذكاء الاصطناعي في القطاع الحكومي', 'القاعة الرئيسية', now() + interval '20 day 8 hour', now() + interval '20 day 9 hour', NULL),
    (ev, s2, 'الابتكار المفتوح والبحث التطبيقي', 'القاعة الرئيسية', now() + interval '20 day 10 hour', now() + interval '20 day 11 hour', NULL),
    (ev, s5, 'ورشة التحول الرقمي', 'قاعة الورش', now() + interval '21 day 9 hour', now() + interval '21 day 11 hour', 'عدد محدود'),
    (ev, s9, 'الطاقة المتجددة والاستدامة', 'القاعة الثانية', now() + interval '21 day 12 hour', now() + interval '21 day 13 hour', NULL);

  INSERT INTO public.invitees (full_name, email, phone, organization, invitee_type) VALUES ('سلطان المطيري', 'sultan@example.com', '+966560000001', 'وزارة الاقتصاد', 'vip') RETURNING id INTO i1;
  INSERT INTO public.invitees (full_name, email, phone, organization, invitee_type) VALUES ('نورة العبدالله', 'noura@example.com', '+966560000002', 'جامعة الأميرة نورة', 'academic') RETURNING id INTO i2;
  INSERT INTO public.invitees (full_name, email, phone, organization, invitee_type) VALUES ('عمر الحمد', 'omar@example.com', '+966560000003', 'صحيفة الاقتصادية', 'media') RETURNING id INTO i3;
  INSERT INTO public.invitees (full_name, email, phone, organization, invitee_type) VALUES ('هيا الفهد', 'haya@example.com', '+966560000004', 'شركة نماء', 'guest') RETURNING id INTO i4;
  INSERT INTO public.invitees (full_name, email, phone, organization, invitee_type) VALUES ('فيصل القرني', 'faisal@example.com', '+966560000005', 'هيئة الاتصالات', 'vip') RETURNING id INTO i5;
  INSERT INTO public.invitees (full_name, email, phone, organization, invitee_type) VALUES ('دانة السويلم', 'dana@example.com', '+966560000006', 'قناة العربية', 'media') RETURNING id INTO i6;
  INSERT INTO public.invitees (full_name, email, phone, organization, invitee_type) VALUES ('راكان الزيد', 'rakan@example.com', '+966560000007', 'شركة تمكين', 'guest') RETURNING id INTO i7;
  INSERT INTO public.invitees (full_name, email, phone, organization, invitee_type) VALUES ('لمى العنقري', 'lama@example.com', '+966560000008', 'مركز الأبحاث', 'academic') RETURNING id INTO i8;

  INSERT INTO public.invitations (event_id, invitee_id, status, sent_at, responded_at) VALUES (ev, i1, 'accepted', now() - interval '6 day', now() - interval '5 day') RETURNING id INTO inv1;
  INSERT INTO public.invitations (event_id, invitee_id, status, sent_at, responded_at) VALUES (ev, i2, 'accepted', now() - interval '6 day', now() - interval '4 day') RETURNING id INTO inv2;
  INSERT INTO public.invitations (event_id, invitee_id, status, sent_at, responded_at) VALUES (ev, i3, 'accepted', now() - interval '6 day', now() - interval '4 day') RETURNING id INTO inv3;
  INSERT INTO public.invitations (event_id, invitee_id, status, sent_at, responded_at) VALUES
    (ev, i4, 'sent', now() - interval '6 day', NULL),
    (ev, i5, 'declined', now() - interval '6 day', now() - interval '3 day'),
    (ev, i6, 'sent', now() - interval '5 day', NULL),
    (ev, i7, 'accepted', now() - interval '5 day', now() - interval '2 day'),
    (ev, i8, 'pending', NULL, NULL);

  INSERT INTO public.attendance (event_id, invitee_id, invitation_id, checked_in_at, method) VALUES
    (ev, i1, inv1, now() - interval '1 hour', 'qr'),
    (ev, i2, inv2, now() - interval '50 minute', 'manual'),
    (ev, i3, inv3, now() - interval '35 minute', 'qr');
END $$;