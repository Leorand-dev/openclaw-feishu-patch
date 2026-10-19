import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\patches\2026.10.5\patched.mjs")
t=p.read_text(encoding="utf-8")
# constructor flag
old='''		this.statusUnavailable = false;
	}'''
new='''		this.statusUnavailable = false;
		this.statusConfirmed = false;
	}'''
assert t.count(old)==1
t=t.replace(old,new,1)
# log after successful status write
old2='''			}), (response, auditContext) => assertSuccessfulCardKitResponse(response, auditContext, "Update card status content"));
			return true;'''
new2='''			}), (response, auditContext) => assertSuccessfulCardKitResponse(response, auditContext, "Update card status content"));
			if (!this.statusConfirmed) {
				this.statusConfirmed = true;
				this.log?.("Card status element update OK");
			}
			return true;'''
assert old2 in t
t=t.replace(old2,new2,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("status success log added")
