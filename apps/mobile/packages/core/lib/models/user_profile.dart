import 'package:equatable/equatable.dart';

import 'enums.dart';

class UserProfile extends Equatable {
  final String id;
  final String email;
  final String? phone;
  final String name;
  final UserRole role;
  final String? tenantId;
  final String? avatarUrl;

  const UserProfile({
    required this.id,
    required this.email,
    this.phone,
    required this.name,
    required this.role,
    this.tenantId,
    this.avatarUrl,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final roleRaw = json['role'];
    final roleStr = roleRaw is String ? roleRaw : null;

    return UserProfile(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      name: json['name'] as String? ?? '',
      role: UserRole.fromString(roleStr),
      tenantId: json['tenantId'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'email': email,
      'phone': phone,
      'name': name,
      'role': role.value,
      'tenantId': tenantId,
      'avatarUrl': avatarUrl,
    };
  }

  @override
  List<Object?> get props => [
        id,
        email,
        phone,
        name,
        role,
        tenantId,
        avatarUrl,
      ];
}
