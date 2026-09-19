import re
import sys

file_path = "src/pages/Staff.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. StaffRecord interface
content = content.replace(
    "  branchId?: string;\n  userType?: string;",
    "  branchId?: string;\n  partnerId?: string;\n  userType?: string;"
)
content = content.replace(
    "    code?: string;\n  };\n  role?: {",
    "    code?: string;\n  };\n  pathologyPartner?: {\n    labName: string;\n    city?: string;\n  };\n  role?: {"
)

# 2. branches state
content = content.replace(
    "const [branches, setBranches] = useState<Branch[]>([]);",
    "const [branches, setBranches] = useState<any[]>([]);"
)

# 3. getAdminLocations
content = content.replace(
    "branchService.getAll(),",
    "branchService.getAdminLocations(),"
)

# userPartnerId
content = content.replace(
    "  const userBranchId = (currentUser as any)?.branchId || (currentUser as any)?.adminUser?.branchId || '';",
    "  const userBranchId = (currentUser as any)?.branchId || (currentUser as any)?.adminUser?.branchId || '';\n  const userPartnerId = (currentUser as any)?.partnerId || (currentUser as any)?.adminUser?.partnerId || '';"
)

# 4. openCreate
content = content.replace(
    "const userBranch = userBranchId || (currentUser as any)?.branchId || (branches[0]?.id || '');\n    setFormBranchId(userBranch || '');",
    "const userBranch = userBranchId ? `BRANCH:${userBranchId}` : (userPartnerId ? `PARTNER:${userPartnerId}` : (branches[0] ? `${branches[0].type}:${branches[0].id}` : ''));\n    setFormBranchId(userBranch);"
)

# 5. openEdit
content = content.replace(
    "setFormBranchId(s.branchId || (s as any).branch?.id || '');",
    "const initBranch = s.branchId ? `BRANCH:${s.branchId}` : (s.partnerId ? `PARTNER:${s.partnerId}` : '');\n    setFormBranchId(initBranch);"
)

# 6. handleSave
handle_save_old = """    const targetBranchId = formBranchId || userBranchId || undefined;"""
handle_save_new = """    let finalBranchId = undefined;
    let finalPartnerId = undefined;
    if (formBranchId) {
      const parts = formBranchId.split(':');
      if (parts[0] === 'BRANCH') finalBranchId = parts[1];
      else if (parts[0] === 'PARTNER') finalPartnerId = parts[1];
    } else if (userBranchId) {
      finalBranchId = userBranchId;
    } else if (userPartnerId) {
      finalPartnerId = userPartnerId;
    }"""
content = content.replace(handle_save_old, handle_save_new)

payload_old = """      designation: finalDesignation || undefined,
      branchId: targetBranchId,"""
payload_new = """      designation: finalDesignation || undefined,
      branchId: finalBranchId,
      partnerId: finalPartnerId,"""
content = content.replace(payload_old, payload_new)

# 7. baseStaffList
base_old = """  const baseStaffList = useMemo(() => {
    if (!isSuperAdmin && userBranchId) {
      return staffList.filter(s => s.branchId === userBranchId || s.branch?.id === userBranchId);
    }
    return staffList;
  }, [staffList, isSuperAdmin, userBranchId]);"""
base_new = """  const baseStaffList = useMemo(() => {
    if (!isSuperAdmin && userBranchId) {
      return staffList.filter(s => s.branchId === userBranchId || s.branch?.id === userBranchId);
    }
    if (!isSuperAdmin && userPartnerId) {
      return staffList.filter(s => s.partnerId === userPartnerId);
    }
    return staffList;
  }, [staffList, isSuperAdmin, userBranchId, userPartnerId]);"""
content = content.replace(base_old, base_new)

# 8. filteredStaff
filter_old = """if (branchFilter !== 'ALL' && s.branchId !== branchFilter) return false;"""
filter_new = """      if (branchFilter !== 'ALL') {
        const parts = branchFilter.split(':');
        if (parts[0] === 'BRANCH' && s.branchId !== parts[1]) return false;
        if (parts[0] === 'PARTNER' && s.partnerId !== parts[1]) return false;
      }"""
content = content.replace(filter_old, filter_new)

# 9. dropdown filter
dropdown_old = """            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
            ))}"""
dropdown_new = """            {branches.map(b => (
              <option key={`${b.type}:${b.id}`} value={`${b.type}:${b.id}`}>{b.name} ({b.city})</option>
            ))}"""
content = content.replace(dropdown_old, dropdown_new)

# 10. Table display
table_old = """                  {/* Branch */}
                  <td className="px-5 py-3.5 text-xs">
                    {s.branch?.name ? (
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{s.branch.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">All Branches / Central</span>
                    )}
                  </td>"""
table_new = """                  {/* Branch */}
                  <td className="px-5 py-3.5 text-xs">
                    {s.branch?.name ? (
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{s.branch.name}</span>
                      </div>
                    ) : s.pathologyPartner?.labName ? (
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{s.pathologyPartner.labName}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">All Branches / Central</span>
                    )}
                  </td>"""
content = content.replace(table_old, table_new)

# 11. Assign Branch disable logic
assign_old = """disabled={!isSuperAdmin && !!userBranchId}
                    className={`w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${!isSuperAdmin && !!userBranchId ? 'opacity-80 cursor-not-allowed bg-muted' : ''}`}
                  >
                    {isSuperAdmin && <option value="">All Branches / Central</option>}
                    {branches
                      .filter(b => isSuperAdmin || !userBranchId || b.id === userBranchId)
                      .map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                      ))}"""
assign_new = """disabled={!isSuperAdmin && (!!userBranchId || !!userPartnerId)}
                    className={`w-full h-10 px-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${!isSuperAdmin && (!!userBranchId || !!userPartnerId) ? 'opacity-80 cursor-not-allowed bg-muted' : ''}`}
                  >
                    {isSuperAdmin && <option value="">All Branches / Central</option>}
                    {branches
                      .filter(b => isSuperAdmin || (!userBranchId && !userPartnerId) || (b.type === 'BRANCH' && b.id === userBranchId) || (b.type === 'PARTNER' && b.id === userPartnerId))
                      .map(b => (
                        <option key={`${b.type}:${b.id}`} value={`${b.type}:${b.id}`}>{b.name} ({b.city})</option>
                      ))}"""
content = content.replace(assign_old, assign_new)

# 12. search branch
search_old = "s.branch?.name.toLowerCase().includes(q) ||"
search_new = "s.branch?.name.toLowerCase().includes(q) ||\n          s.pathologyPartner?.labName.toLowerCase().includes(q) ||"
content = content.replace(search_old, search_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Staff.tsx")
